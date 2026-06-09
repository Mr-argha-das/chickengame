import { WalletTransaction } from "../models/walletTransaction.model.js";
import { User } from "../models/user.model.js";
import { Withdrawal } from "../models/withdrawal.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createInterface } from "readline";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { Api } from "telegram";
import config from "../utils/config.js";
// import { TelegramClient } from "telegram";
// import { StringSession } from "telegram/sessions/index.js";
// import { Api } from "telegram";
// import express from "express";
// import promptSync from "prompt-sync";
// const prompt = promptSync();
// const apiId = 23416733; // my.telegram.org से लो
// const apiHash = "e87f3e11b9917aa1cb3c0cd4f9a3c63c";
// const stringSession = new StringSession(""); // पहली बार खाली

// const client = new TelegramClient(stringSession, apiId, apiHash, {
//   connectionRetries: 5,
// });
const apiId = config.telegramApiid;
const apiHash = config.telegramApiHash;

const stringSession = new StringSession(process.env.TELEGRAM_SESSION || "");

// const apiId = Number(process.env.TELEGRAM_API_ID);
// const apiHash = process.env.TELEGRAM_API_HASH;

const addMoneyToWallet = asyncHandler(async (req, res) => {
  const { amount, method, isPaid } = req.body;

  if (!amount || amount <= 0) {
    throw new apiError(400, "Invalid amount");
  }

  if (!["UPI", "Crypto", "Telegram"].includes(method)) {
    throw new apiError(400, "Invalid payment method");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new apiError(404, "User not found");
  }

  // Create wallet transaction
  const walletTxn = await WalletTransaction.create({
    userId: user._id,
    type: "deposit",
    amount,
    method,
    status: isPaid ? "approved" : "pending",
    adminVerified: isPaid,
    remark: isPaid ? "Payment successful" : "Awaiting payment verification",
  });

  // Update balance if payment is successful
  if (isPaid) {
    user.walletBalance += amount;
    await user.save();
  }

  return res.status(201).json(
    new apiResponse(
      201,
      {
        transaction: walletTxn,
        walletBalance: user.walletBalance,
      },
      isPaid
        ? `✅ ₹${amount} added to wallet`
        : "✅ Transaction created, awaiting confirmation"
    )
  );
});

const requestWithdrawal = asyncHandler(async (req, res) => {
  try {
    const {
      amount,
      method,
      details, // object containing transaction-specific details
      remarks,
    } = req.body;
    const userId = req.user._id;

    // 1. Validate input
    if (!amount || amount <= 0) {
      throw new apiError(400, "Invalid amount");
    }

    if (!amount || !method) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new apiError(404, "User not found");
    }

    if (user.walletBalance < amount) {
      throw new apiError(400, "Insufficient wallet balance");
    }

    user.walletBalance -= amount;
    user.save();

    // 3. Log WalletTransaction (status: pending)
    const newTransaction = new WalletTransaction({
      userId,
      type: "withdrawal",
      amount,
      method,
      status: "pending",
      adminVerified: false,
      details: details || {},
      remarks: remarks || [],
    });

    const savedTransaction = await newTransaction.save();

    return res.status(201).json(
      new apiResponse(
        201,
        {
          savedTransaction,
        },
        "✅ Withdrawal request submitted. Awaiting admin approval."
      )
    );
  } catch (error) {
    console.error("Error creating wallet transaction:", error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error" });
  }
});

const getUserTransactionHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    WalletTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WalletTransaction.countDocuments({ userId }),
  ]);

  return res.status(200).json(
    new apiResponse(
      200,
      {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        transactions,
      },
      "✅ Transaction history fetched"
    )
  );
});

const getAllUsersTransactionHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    WalletTransaction.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
    WalletTransaction.countDocuments({}),
  ]);

  return res.status(200).json(
    new apiResponse(
      200,
      {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        transactions,
      },
      "✅ All users' transaction history fetched"
    )
  );
});

const updateWalletTransactionStatus = async (req, res) => {
  try {
    const { status, id } = req.body;

    // Validate status input if provided
    const validStatuses = [
      "pending",
      "approved",
      "rejected",
      "failed",
      "completed",
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Default values for `adminVerified` and `remark`
    const adminVerified = true; // Always set to true
    const remark = "Status updated by admin."; // Default remark

    // Prepare the update fields
    const updateFields = {
      status,
      adminVerified, // Set adminVerified to true
    };

    // Add remark to the `remarks` array
    updateFields.$push = {
      remarks: {
        message: remark,
        createdAt: new Date(),
      },
    };

    const transaction = await WalletTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (
      transaction.type === "withdrawal" &&
      status === "rejected" &&
      transaction.status !== "rejected"
    ) {
      const user = await User.findById(transaction.userId);
      user.walletBalance += transaction.amount;
      await user.save();
    }

    const updatedTransaction = await WalletTransaction.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    // Return the updated transaction
    res.status(200).json(updatedTransaction);
  } catch (error) {
    console.error("Error updating transaction status:", error);
    res.status(500).json({
      message: "An error occurred while updating the transaction status",
    });
  }
};

const getAllWithdrawalsHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [withdrawals, total] = await Promise.all([
    WalletTransaction.find({ type: "withdrawal" }) // Only fetch records where type is 'withdrawal'
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WalletTransaction.countDocuments({ type: "withdrawal" }), // Count only 'withdrawal' transactions
  ]);

  return res.status(200).json(
    new apiResponse(
      200,
      {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        withdrawals, // Return withdrawal transactions
      },
      "✅ All withdrawal history fetched"
    )
  );
});

const getAllDepositeHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [deposit, total] = await Promise.all([
    WalletTransaction.find({ type: "deposit" }) // Only fetch records where type is 'withdrawal'
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WalletTransaction.countDocuments({ type: "deposit" }), // Count only 'withdrawal' transactions
  ]);
  console.log(JSON.stringify(deposit));

  return res.status(200).json(
    new apiResponse(
      200,
      {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        deposit, // Return withdrawal transactions
      },
      "✅ All deposit history fetched"
    )
  );
});

// This one
const updateTelegramDepositeTransactionStatus = async (req, res) => {
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  try {
    await client.connect();
    const { status, id, userId, amount, channelId } = req.body;

    console.log("📩 Body:", req.body);

    const validStatuses = [
      "pending",
      "approved",
      "rejected",
      "failed",
      "completed",
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const transaction = await WalletTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const remark = "Status updated by admin.";
    const updateFields = {
      status,
      adminVerified: true,
      $push: {
        remarks: {
          message: remark,
          createdAt: new Date(),
        },
      },
    };

    // Handle approved status - invite user to channel
    if (status === "approved") {
      try {
        const channel = await client.getEntity(channelId);
        const user = await client.getEntity(transaction.details.telegramID);

        // Update transaction first
        await WalletTransaction.findByIdAndUpdate(id, updateFields, {
          new: true,
        });

        // Invite user to channel
        await client.invoke(
          new Api.channels.InviteToChannel({
            channel: channel,
            users: [user],
          })
        );

        return res.json({ success: true, message: "User invited!" });
      } catch (err) {
        console.error("Telegram operation failed:", err);
        return res.status(500).json({
          success: false,
          message: "Telegram error: " + err.message || "Failed to invite user",
        });
      }
    }

    // Handle rejected, failed, completed, or pending
    await WalletTransaction.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

    return res.json({
      success: true,
      message: `Transaction ${status}`,
    });
  } catch (error) {
    console.error("❌ Error updating transaction:", error);
    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "An error occurred while updating the transaction status",
    });
  } finally {
    client.disconnect();
  }
};

const updateDepositeTransactionStatus = async (req, res) => {
  try {
    const { status, id } = req.body;

    // Validate status input if provided
    const validStatuses = [
      "pending",
      "approved",
      "rejected",
      "failed",
      "completed",
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Default values for `adminVerified` and `remark`
    const adminVerified = true; // Always set to true
    const remark = "Status updated by admin."; // Default remark

    // Prepare the update fields
    const updateFields = {
      status,
      adminVerified, // Set adminVerified to true
    };

    // Add remark to the `remarks` array
    updateFields.$push = {
      remarks: {
        message: remark,
        createdAt: new Date(),
      },
    };

    const transaction = await WalletTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (
      transaction.type === "deposit" &&
      status === "approved" &&
      transaction.status !== "approved"
    ) {
      const user = await User.findById(transaction.userId);
      user.walletBalance += transaction.amount;
      await user.save();
    }

    const updatedTransaction = await WalletTransaction.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    // Return the updated transaction
    res.status(200).json(updatedTransaction);
  } catch (error) {
    console.error("Error updating transaction status:", error);
    res.status(500).json({
      message: "An error occurred while updating the transaction status",
    });
  }
};

const requestDeposite = asyncHandler(async (req, res) => {
  try {
    const {
      amount,
      method,
      details, // object containing transaction-specific details
      remarks,
    } = req.body;
    const userId = req.user._id;

    // 1. Validate input
    if (!amount || amount <= 0) {
      throw new apiError(400, "Invalid amount");
    }

    if (!amount || !method) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new apiError(404, "User not found");
    }

    // 3. Log WalletTransaction (status: pending)
    const newTransaction = new WalletTransaction({
      userId,
      type: "deposit",
      amount,
      method,
      status: "pending",
      adminVerified: false,
      details: details || {},
      remarks: remarks || [],
    });
    console.log(details);

    const savedTransaction = await newTransaction.save();

    return res.status(201).json(
      new apiResponse(
        201,
        {
          savedTransaction,
        },
        "✅ deposit request submitted. Awaiting admin approval."
      )
    );
  } catch (error) {
    console.error("Error creating wallet transaction:", error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error" });
  }
});

export {
  addMoneyToWallet,
  requestWithdrawal,
  getUserTransactionHistory,
  updateWalletTransactionStatus,
  getAllUsersTransactionHistory,
  getAllWithdrawalsHistory,
  getAllDepositeHistory,
  requestDeposite,
  updateDepositeTransactionStatus,
  updateTelegramDepositeTransactionStatus,
};
