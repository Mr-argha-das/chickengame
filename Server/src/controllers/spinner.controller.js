import Prize from "../models/spinner.model.js";
import { SpinHistory } from "../models/spinHistory.model.js";
import { User } from "../models/user.model.js";

const SPIN_COOLDOWN_MS = 60 * 60 * 1000;

const parseRewardAmount = (outcome) => {
  if (typeof outcome === "number") return outcome;
  const match = String(outcome || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
};

// ✅ Add a new document with full prizes array
export const addPrizes = async (req, res) => {
  try {
    const { prizes } = req.body; // array of strings
    const newPrizes = new Prize({ prizes });
    await newPrizes.save();
    res.status(201).json(newPrizes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get all prize documents
export const getAllPrizes = async (req, res) => {
  try {
    const prizes = await Prize.find().sort({ createdAt: -1 });
    res.json(prizes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const claimSpinReward = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { outcome } = req.body;
    const normalizedOutcome = String(outcome || "").trim();
    const rewardAmount = parseRewardAmount(normalizedOutcome);

    if (!normalizedOutcome) {
      return res.status(400).json({ message: "Spin outcome is required" });
    }

    const latestSpin = await SpinHistory.findOne({ userId }).sort({
      createdAt: -1,
    });

    if (
      latestSpin &&
      Date.now() - latestSpin.createdAt.getTime() < SPIN_COOLDOWN_MS
    ) {
      const remainingMs =
        SPIN_COOLDOWN_MS - (Date.now() - latestSpin.createdAt.getTime());

      return res.status(429).json({
        message: "You can spin again after cooldown",
        remainingMs,
      });
    }

    const latestPrizeDoc = await Prize.findOne().sort({ createdAt: -1 });
    const allowedPrizes = latestPrizeDoc?.prizes?.map((p) => String(p)) || [];

    if (!allowedPrizes.includes(normalizedOutcome)) {
      return res.status(400).json({ message: "Invalid spin outcome" });
    }

    const spinHistory = await SpinHistory.create({
      userId,
      spinType: "daily",
      outcome: normalizedOutcome,
      rewardAmount,
      addedToWallet: rewardAmount > 0,
    });

    let walletBalance = null;
    if (rewardAmount > 0) {
      const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { walletBalance: rewardAmount } },
        { new: true }
      ).select("walletBalance");
      walletBalance = user?.walletBalance ?? null;
    } else {
      const user = await User.findById(userId).select("walletBalance");
      walletBalance = user?.walletBalance ?? null;
    }

    return res.status(200).json({
      success: true,
      data: {
        outcome: normalizedOutcome,
        rewardAmount,
        walletBalance,
        spinHistory,
      },
      message:
        rewardAmount > 0
          ? `₹${rewardAmount} credited to wallet`
          : "No wallet credit for this spin",
    });
  } catch (err) {
    console.error("Error claiming spin reward:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get one document by ID
export const getPrizeById = async (req, res) => {
  try {
    const { id } = req.params;
    const prize = await Prize.findById(id);

    if (!prize) return res.status(404).json({ message: "Prize not found" });
    res.json(prize);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Replace entire array by ID
export const updatePrizes = async (req, res) => {
  try {
    const { id } = req.params;
    const { prizes } = req.body;

    const updatedPrize = await Prize.findByIdAndUpdate(
      id,
      { prizes },
      { new: true }
    );

    if (!updatedPrize)
      return res.status(404).json({ message: "Prize not found" });

    res.json(updatedPrize);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Add one new item into prizes array
export const addPrizeItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { prize } = req.body; // single string

    const updatedPrize = await Prize.findByIdAndUpdate(
      id,
      { $push: { prizes: prize } }, // add item
      { new: true }
    );

    if (!updatedPrize)
      return res.status(404).json({ message: "Prize not found" });

    res.json(updatedPrize);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Remove one item from prizes array
export const removePrizeItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { prize } = req.body; // item string to remove

    const updatedPrize = await Prize.findByIdAndUpdate(
      id,
      { $pull: { prizes: prize } }, // remove item
      { new: true }
    );

    if (!updatedPrize)
      return res.status(404).json({ message: "Prize not found" });

    res.json(updatedPrize);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete entire prize document
export const deletePrize = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPrize = await Prize.findByIdAndDelete(id);

    if (!deletedPrize)
      return res.status(404).json({ message: "Prize not found" });

    res.json({ message: "Prize document deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
