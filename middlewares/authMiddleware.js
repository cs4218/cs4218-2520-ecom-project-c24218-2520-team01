import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";

// Protected routes token base
export const requireSignIn = async (req, res, next) => {
    try {
        const decode = JWT.verify(
            req.headers.authorization,
            process.env.JWT_SECRET,
        );

        // A0273278U, Zaidan
        // Session replay fix: reject tokens whose account no longer exists.
        // A structurally valid JWT can still be replayed after the user is deleted;
        // verifying DB existence closes that window.
        const user = await userModel.findById(decode._id);
        if (!user) {
            return res.status(401).send({
                success: false,
                message: "Unauthorized",
            });
        }

        // A0273278U, Zaidan
        // Session replay fix: reject tokens issued before a password change.
        // loginController embeds the last 8 chars of the bcrypt hash (pwdFingerprint)
        // at issue time. If the password has since changed the stored hash differs,
        // so any pre-change token is invalidated here.
        if (
            decode.pwdFingerprint !== undefined &&
            decode.pwdFingerprint !== user.password.slice(-8)
        ) {
            return res.status(401).send({
                success: false,
                message: "Unauthorized",
            });
        }

        req.user = decode;
        next();
    } catch (error) {
        console.log(error);
        res.status(401).send({
            success: false,
            message: "Unauthorized",
        });
    }
};

//admin access
export const isAdmin = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.user._id);
        if (user.role !== 1) {
            return res.status(401).send({
                success: false,
                message: "Unauthorized Access",
            });
        } else {
            next();
        }
    } catch (error) {
        console.log(error);
        res.status(401).send({
            success: false,
            error,
            message: "Error in admin middleware",
        });
    }
};
