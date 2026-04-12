import express from "express";
import rateLimit from "express-rate-limit";
import {
    forgotPasswordController,
    getAllOrdersController,
    getOrdersController,
    getUsersController,
    loginController,
    orderStatusController,
    registerController,
    testController,
    updateProfileController,
} from "../controllers/authController.js";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware.js";

// Zaidan, A0273278U
// AUTHZ-VULN-01: No rate limiting on forgot-password allowed unlimited brute-force
// of security answers. Limit to 5 attempts per IP+email per 15 minutes.
const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => `${req.ip}:${req.body?.email ?? ""}`,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
        res.status(429).json({
            success: false,
            message: "Too many password reset attempts, please try again later",
        }),
});

//router object
const router = express.Router();

//routing
//REGISTER || METHOD POST
router.post("/register", registerController);

//LOGIN || POST
router.post("/login", loginController);

//Forgot Password || POST
router.post(
    "/forgot-password",
    forgotPasswordLimiter,
    forgotPasswordController,
);

//test routes
router.get("/test", requireSignIn, isAdmin, testController);

//protected User route auth
router.get("/user-auth", requireSignIn, (req, res) => {
    res.status(200).send({ ok: true });
});
//protected Admin route auth
router.get("/admin-auth", requireSignIn, isAdmin, (req, res) => {
    res.status(200).send({ ok: true });
});

//update profile
router.put("/profile", requireSignIn, updateProfileController);

//orders
router.get("/orders", requireSignIn, getOrdersController);

//all orders
router.get("/all-orders", requireSignIn, isAdmin, getAllOrdersController);

//all users
// Fixed - no getAllUsers import (Zaidan - A0273278U)
router.get("/all-users", requireSignIn, isAdmin, getUsersController);

// order status update
router.put(
    "/order-status/:orderId",
    requireSignIn,
    isAdmin,
    orderStatusController,
);

export default router;
