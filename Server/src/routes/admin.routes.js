import { Router } from "express";
import { addAdmin, createGameRound, deleteAdmin, deleteGameRound, getAdminAccessPages, getAllAdmins, getAllGameRounds, getGameHistoryByUserAndType, updateAdmin, updateGameRound, updateGameVisibility } from "../controllers/admin.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.use(verifyJWT, authorizeRoles("admin", "limited-admin"))

router.route("/game-round").post(createGameRound)
router.route("/game-round/:id").patch(updateGameRound)
router.route("/game-round/:id").delete(deleteGameRound)
router.route("/game-rounds").get(getAllGameRounds)
router.route("/game-visibility").post(updateGameVisibility)
router.route("/get-admin").get(getAllAdmins)
router.get('/game-history/:userId/:gameType', getGameHistoryByUserAndType);
router.route("/add-admin").post(authorizeRoles("admin"), addAdmin)
router.route("/update-admin").put(authorizeRoles("admin"), updateAdmin)
router.route("/delete-admin").delete(authorizeRoles("admin"), deleteAdmin)
router.route("/access-pages").get(getAdminAccessPages)

export default router
