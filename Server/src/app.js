import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
const app = express();

// const instance = new Razorpay({
//   key_id: process.env.RAZORPAY_API_KEY,
//   key_secret: process.env.RAZORPAY_API_SECRET,
// });

const allowedOrigins = (process.env.CORS_ORIGIN ||
  "http://localhost:5173,https://infinity-games.cc,https://www.infinity-games.cc")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// If uploads is outside src, one level up
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// //Routes import
import userRouter from "./routes/user.routes.js";
import otpRouter from "./routes/otp.routes.js";
import walletRouter from "./routes/wallet.routes.js";
import adminRouter from "./routes/admin.routes.js";
import chickenGameRouter from "./routes/chickenRoad.routes.js";
import colorGameRouter from "./routes/ColorGame.routes.js";
import aviatorRouter from "./routes/aviator.routes.js";
import mineRouter from "./routes/mine.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import telegramRoute from "./routes/telegramBot.routes.js";
import qrRoute from "./routes/qr.code.routes.js";
import qrRouteCrypto from "./routes/qr.crypto.routes.js";
import SpinnerPriceRoute from "./routes/spinner.routes.js";
import referAmount from "./routes/refer.amount.routes.js";

import notificationRouter from "./routes/notification.routes.js";
import telegramAmount from "./routes/telegram.amount.routes.js";
import bannerRouter from "./routes/banner.routes.js";

app.use("/api/v1/notification", notificationRouter);
// //Routes Declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/otp", otpRouter);
app.use("/api/v1/wallet", walletRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/chicken-road", chickenGameRouter);
app.use("/api/v1/color", colorGameRouter);
app.use("/api/v1/aviator", aviatorRouter);
app.use("/api/v1/mine", mineRouter);
app.use("/api/v1/upi", paymentRouter);
app.use("/api/v1/telegram", telegramRoute);
app.use("/api/v1/qrcode", qrRoute);
app.use("/api/v1/qrcodecrypto", qrRouteCrypto);
app.use("/api/v1/spinner", SpinnerPriceRoute);
app.use("/api/v1/refer-amount", referAmount);
app.use("/api/v1/telegram-amount", telegramAmount);
app.use("/api/v1/banners", bannerRouter);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    errors: err.errors || [],
  });
});

export { app };
