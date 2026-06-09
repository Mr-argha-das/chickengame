import { Router } from "express";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addMoneyToWallet,
  getAllUsersTransactionHistory,
  getUserTransactionHistory,
  requestWithdrawal,
  getAllWithdrawalsHistory,
  updateWalletTransactionStatus,
  requestDeposite,
  getAllDepositeHistory,
  updateDepositeTransactionStatus,
  updateTelegramDepositeTransactionStatus,
} from "../controllers/wallet.controller.js";

const router = Router();

router.route("/add-money").post(verifyJWT, addMoneyToWallet);
router.route("/withraw").post(verifyJWT, requestWithdrawal);
router.route("/deposit").post(verifyJWT, requestDeposite);
router.route("/history").get(verifyJWT, getUserTransactionHistory);
router.route("/history/users").get(verifyJWT, authorizeRoles("admin", "limited-admin"), getAllUsersTransactionHistory);
router.route("/history/withdrawals").get(verifyJWT, authorizeRoles("admin", "limited-admin"), getAllWithdrawalsHistory);
router.route("/history/deposit").get(verifyJWT, authorizeRoles("admin", "limited-admin"), getAllDepositeHistory);
router.route("/transaction/status").put(verifyJWT, authorizeRoles("admin", "limited-admin"), updateWalletTransactionStatus);
router.route("/update-transaction-status").put(verifyJWT, authorizeRoles("admin", "limited-admin"), updateWalletTransactionStatus);

router
  .route("/update-deposite-transaction-status")
  .put(verifyJWT, authorizeRoles("admin", "limited-admin"), updateDepositeTransactionStatus);

router
  .route("/telegram/update-deposite-transaction-status")
  .put(verifyJWT, authorizeRoles("admin", "limited-admin"), updateTelegramDepositeTransactionStatus);

export default router;
