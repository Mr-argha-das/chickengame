import { Router } from "express";
import {
  cashOut,
  fetchAllBetsAviator,
  getCurrentRound,
  getGameHistory,
  getUserBets,
  placeBet,
} from "../controllers/aviatorGame.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/current", async (req, res) => {
  try {
    const round = await getCurrentRound();
    res.json({ success: true, data: round });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/bet", verifyJWT, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid amount" });
    }

    const io = req.app.get("io");
    const bet = await placeBet({ userId: req.user._id.toString(), amount }, io);
    res.json({ success: true, data: bet });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/cashout", verifyJWT, async (req, res) => {
  try {
    const io = req.app.get("io");
    const result = await cashOut(req.user._id.toString(), io);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await getGameHistory(limit);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/all-bets", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const bets = await fetchAllBetsAviator(limit);
    res.json({ success: true, data: bets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/user/:userId/bets", verifyJWT, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.role === "user" && req.user._id.toString() !== userId) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const limit = parseInt(req.query.limit) || 50;
    const bets = await getUserBets(userId, limit);
    res.json({ success: true, data: bets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
