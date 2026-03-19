import express from "express";
import { getUsersController } from "../controllers/authController.js";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/all-users", requireSignIn, isAdmin, getUsersController);

export default router;
