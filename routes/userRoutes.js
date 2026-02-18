import express from "express";
import { getUsersController } from "../controllers/userController.js";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware.js";

// Lim Jia Wei, A0277381W

const router = express.Router();

//get all users
router.get("/all-users", requireSignIn, isAdmin, getUsersController);

export default router;
