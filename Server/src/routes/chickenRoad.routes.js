import { Router } from "express";
import { goToNextStep, startGame, stopGame } from "../controllers/chickenRoad.controller.js";
import { handlePreviousUnfinishedSession } from "../middlewares/handlePreviousUnfinishedSession.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/start").post(verifyJWT, handlePreviousUnfinishedSession, startGame)
router.route("/go").post(verifyJWT, goToNextStep)
router.route("/stop").post(verifyJWT, stopGame)
// router.route("/state").get()

export default router
