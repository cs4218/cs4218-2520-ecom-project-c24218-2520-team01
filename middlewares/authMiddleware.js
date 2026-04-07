import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";

// Protected routes token base
export const requireSignIn = async (req, res, next) => {
    try {
        const decode = JWT.verify(
            req.headers.authorization,
            process.env.JWT_SECRET,
        );

        // A0273278U Zaidan
        // Checks if user is still in database
        const user = await userModel.findById(decode._id);
        if (!user) {
            return res.status(401).send({
                success: false,
                message: "Unauthorized",
            });
        }

        // A0273278U Zaidan
        // Checks if password changed is the same (prevents usage of changed password tokens)
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
