import { User } from "../models/user.model.js";
import { GameRound } from "../models/gameRound.model.js";
import { UserGameSession } from "../models/userGameSession.model.js";
import { GameHistory } from "../models/gameHistory.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const startGame = asyncHandler(async (req, res) => {
    const { betAmount, difficulty } = req.body;
    const gameType = "chicken";
    const userId = req.user._id;

    if (!betAmount || betAmount < 10) {
        throw new apiError(400, "Invalid bet amount");
    }

    if (!["chicken", "aviator", "color", "mining"].includes(gameType)) {
        throw new apiError(400, "Invalid game type");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new apiError(404, "User not found");
    }

    if (user.walletBalance < betAmount) {
        throw new apiError(400, "Insufficient wallet balance");
    }

    // Deduct the bet amount
    user.walletBalance -= betAmount;
    await user.save();

    let multipliers = [];
    let roundId = null;
    const now = new Date();

    // 🔍 Check for an active admin round during the current time window
    const scheduledRound = await GameRound.findOne({
        gameType,
        startTime: { $lte: now },
        endTime: { $gt: now },
        status: { $in: ["scheduled", "active"] }
    }).sort({ startTime: -1 });
    console.log(now)

    if (scheduledRound) {
        multipliers = scheduledRound.multipliers;
        roundId = scheduledRound._id;
    } else {
        // 🔁 Generate fallback random multipliers
        let totalSteps = Math.floor(Math.random() * 7) + 2;
        let multipl = 0.4;
        let startPoint = 1.02
        if (difficulty === "Medium") {
            totalSteps = Math.floor(Math.random() * 6) + 2;
            multipl = 0.6;
            startPoint = 1.22
        } else if (difficulty === "Hard") {
            totalSteps = Math.floor(Math.random() * 5) + 2;
            multipl = 0.75;
            startPoint = 1.37
        } else if (difficulty === "Hardest") {
            totalSteps = Math.floor(Math.random() * 4) + 2;
            multipl = 0.9;
            startPoint = 1.52
        } else {
            totalSteps = Math.floor(Math.random() * 7) + 2;
            multipl = 0.4;
            startPoint = 1.02
        }

        const crashIndex = Math.floor(Math.random() * totalSteps);

        for (let i = 0; i < totalSteps; i++) {
            if (i === crashIndex) {
                multipliers.push(0.0);
                break;
            }
            const multiplier = parseFloat((startPoint + i * multipl).toFixed(2));
            multipliers.push(multiplier);
        }
    }

    // 💾 Save session
    const session = await UserGameSession.create({
        userId,
        gameType,
        betAmount,
        multipliers,
        currentStepIndex: multipliers[0] === 0.0 ? 0 : 1,
        isCrashed: multipliers[0] === 0.0,
        roundId
    });

    if (multipliers[0] === 0.0) {
        await GameHistory.create({
            userId,
            gameType,
            result: "loss",
            betAmount,
            payoutAmount: 0,
            win: false,
            roundId: roundId?.toString() || null
        });
    }

    return res.status(201).json(
        new apiResponse(201, {
            sessionId: session._id,
            firstMultiplier: multipliers[0],
            multipliers,
            stepIndex: 0,
            gameType
        }, "🎮 Game started successfully")
    );
});

const goToNextStep = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // 1. Get the user's active session
    const session = await UserGameSession.findOne({
        userId,
        isStopped: false,
        isCrashed: false
    });

    if (!session) {
        throw new apiError(400, "No active game session found");
    }

    const currentIndex = session.currentStepIndex;
    const multipliers = session.multipliers;

    // 2. Validate index
    if (currentIndex >= multipliers.length) {
        throw new apiError(400, "Game already ended. No further steps.");
    }

    const currentMultiplier = multipliers[currentIndex];

    if (currentMultiplier === 0.0) {
        // 3. Game crashed at this step
        session.isCrashed = true;
        session.currentStepIndex = currentIndex;
        await session.save();

        // Log crash in history
        await GameHistory.create({
            userId,
            gameType: session.gameType,
            result: "loss",
            betAmount: session.betAmount,
            payoutAmount: 0,
            win: false,
            roundId: session.roundId?.toString() || null
        });

        return res.status(200).json(
            new apiResponse(200, {
                crashed: true,
                multiplier: 0.0,
                message: "💥 Game crashed at this step"
            })
        );
    }

    // 4. Safe step — move forward
    session.currentStepIndex += 1;
    await session.save();

    return res.status(200).json(
        new apiResponse(200, {
            multiplier: currentMultiplier,
            stepIndex: session.currentStepIndex,
            crashed: false
        }, "➡️ Next step reached")
    );
});

const stopGame = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // 1. Get active session
    const session = await UserGameSession.findOne({
        userId,
        isStopped: false,
        isCrashed: false
    });

    if (!session) {
        throw new apiError(400, "No active session to stop");
    }

    const payoutIndex = session.currentStepIndex - 1;
    if (payoutIndex < 0 || session.multipliers[payoutIndex] === 0.0) {
        throw new apiError(400, "No safe step available to cash out");
    }

    const payout = Number((session.betAmount * session.multipliers[payoutIndex]).toFixed(2));

    // 3. Update wallet
    const user = await User.findById(userId);
    user.walletBalance += payout;
    await user.save();

    // 4. Update session
    session.isStopped = true;
    session.payoutAmount = payout;
    await session.save();

    if (payout == 0) {
        await GameHistory.create({
            userId,
            gameType: session.gameType,
            result: "loss",
            betAmount: session.betAmount,
            payoutAmount: 0,
            win: false,
            roundId: session.roundId?.toString() || null
        });
    } else {
        // 5. Log Game History
        await GameHistory.create({
            userId,
            gameType: session.gameType,
            result: "win",
            betAmount: session.betAmount,
            payoutAmount: payout,
            win: true,
            roundId: session.roundId?.toString() || null
        });
    }

    return res.status(200).json(
        new apiResponse(200, {
            payout,
            message: "✅ Game stopped successfully"
        })
    );
});

export {
    startGame,
    goToNextStep,
    stopGame
}
