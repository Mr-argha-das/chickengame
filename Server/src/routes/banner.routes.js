import { Router } from "express";
import {
  addBanner,
  deleteBanner,
  getBanners,
  uploadBanner,
} from "../controllers/banner.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", getBanners);
router.post(
  "/",
  verifyJWT,
  authorizeRoles("admin", "limited-admin"),
  uploadBanner.single("banner"),
  addBanner
);
router.delete(
  "/:id",
  verifyJWT,
  authorizeRoles("admin", "limited-admin"),
  deleteBanner
);

export default router;
