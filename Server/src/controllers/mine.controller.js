import { GameHistory } from "../models/gameHistory.model.js";
import { User } from "../models/user.model.js";
import { UserGameSession } from "../models/userGameSession.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const TILE_COUNT = 25;

const shuffleTiles = () => {
  const tiles = Array.from({ length: TILE_COUNT }, (_, index) => index);
  for (let i = tiles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
};

const getMultiplier = (safeClicks, mineCount) => {
  const step = 0.2 + 0.05 * (mineCount - 3);
  return Number((1 + safeClicks * step).toFixed(2));
};

export const startMineGame = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const betAmount = Number(req.body.betAmount);
  const mineCount = Number(req.body.mineCount || 3);

  if (!betAmount || betAmount < 10) {
    throw new apiError(400, "Invalid bet amount");
  }

  if (!Number.isInteger(mineCount) || mineCount < 3 || mineCount > 24) {
    throw new apiError(400, "Invalid mine count");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new apiError(404, "User not found");
  }

  if (user.walletBalance < betAmount) {
    throw new apiError(400, "Insufficient wallet balance");
  }

  const activeSession = await UserGameSession.findOne({
    userId,
    gameType: "mining",
    isStopped: false,
    isCrashed: false,
  });

  if (activeSession) {
    activeSession.isCrashed = true;
    activeSession.payoutAmount = 0;
    await activeSession.save();

    await GameHistory.create({
      userId,
      gameType: "mining",
      result: "loss",
      betAmount: activeSession.betAmount,
      payoutAmount: 0,
      win: false,
      roundId: activeSession._id.toString(),
    });
  }

  const minePositions = shuffleTiles().slice(0, mineCount);
  user.walletBalance = Number((user.walletBalance - betAmount).toFixed(2));
  await user.save();

  const session = await UserGameSession.create({
    userId,
    gameType: "mining",
    betAmount,
    multipliers: minePositions,
    mineCount,
    revealedTiles: [],
    currentStepIndex: 0,
  });

  return res.status(201).json(
    new apiResponse(
      201,
      {
        sessionId: session._id,
        mineCount,
        multiplier: getMultiplier(0, mineCount),
        walletBalance: user.walletBalance,
      },
      "Mines game started"
    )
  );
});

export const revealMineTile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const tileIndex = Number(req.body.tileIndex);

  if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= TILE_COUNT) {
    throw new apiError(400, "Invalid tile");
  }

  const session = await UserGameSession.findOne({
    userId,
    gameType: "mining",
    isStopped: false,
    isCrashed: false,
  });

  if (!session) {
    throw new apiError(400, "No active mines game");
  }

  if (session.revealedTiles.includes(tileIndex)) {
    throw new apiError(400, "Tile already revealed");
  }

  const minePositions = session.multipliers;
  const hitMine = minePositions.includes(tileIndex);

  session.revealedTiles.push(tileIndex);

  if (hitMine) {
    session.isCrashed = true;
    session.payoutAmount = 0;
    await session.save();

    await GameHistory.create({
      userId,
      gameType: "mining",
      result: "loss",
      betAmount: session.betAmount,
      payoutAmount: 0,
      win: false,
      roundId: session._id.toString(),
    });

    return res.status(200).json(
      new apiResponse(200, {
        hitMine: true,
        tileIndex,
        minePositions,
        payout: 0,
      })
    );
  }

  session.currentStepIndex = session.revealedTiles.length;
  await session.save();

  return res.status(200).json(
    new apiResponse(200, {
      hitMine: false,
      tileIndex,
      revealedTiles: session.revealedTiles,
      multiplier: getMultiplier(session.currentStepIndex, session.mineCount),
    })
  );
});

export const stopMineGame = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const session = await UserGameSession.findOne({
    userId,
    gameType: "mining",
    isStopped: false,
    isCrashed: false,
  });

  if (!session) {
    throw new apiError(400, "No active mines game");
  }

  if (session.currentStepIndex <= 0) {
    throw new apiError(400, "Reveal at least one gem before cashing out");
  }

  const multiplier = getMultiplier(session.currentStepIndex, session.mineCount);
  const payout = Number((session.betAmount * multiplier).toFixed(2));
  const user = await User.findById(userId);

  if (!user) {
    throw new apiError(404, "User not found");
  }

  user.walletBalance = Number((user.walletBalance + payout).toFixed(2));
  await user.save();

  session.isStopped = true;
  session.payoutAmount = payout;
  await session.save();

  await GameHistory.create({
    userId,
    gameType: "mining",
    result: "win",
    betAmount: session.betAmount,
    payoutAmount: payout,
    win: true,
    roundId: session._id.toString(),
  });

  return res.status(200).json(
    new apiResponse(200, {
      payout,
      multiplier,
      walletBalance: user.walletBalance,
    })
  );
});
