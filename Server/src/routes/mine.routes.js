import { Router } from "express";
import {
  revealMineTile,
  startMineGame,
  stopMineGame,
} from "../controllers/mine.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/start", verifyJWT, startMineGame);
router.post("/reveal", verifyJWT, revealMineTile);
router.post("/stop", verifyJWT, stopMineGame);

export default router;
