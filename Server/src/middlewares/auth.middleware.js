import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization") || "";
    const headerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    const token = headerToken || req.cookies?.accessToken;

    if (!token) {
      throw new apiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new apiError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.clearCookie("refreshtoken");

    return res.status(401).json({
      message:
        error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError"
          ? "Invalid or expired session. Please login again."
          : error?.message || "Invalid Access Token",
    });
  }
});

export const authorizeRoles = (...roles) =>
    asyncHandler(async (req, res, next) => {
        if (!req.user) {
            throw new apiError(401, "Unauthorized request")
        }

        if (!roles.includes(req.user.role)) {
            throw new apiError(403, "Forbidden request")
        }

        next()
    })
