import userModel from "../models/userModel.js";

// Lim Jia Wei, A0277381W

//get all users
export const getUsersController = async (req, res) => {

    try {
        const users = await userModel
            .find({});
        res.status(200).send({
            success: true,
            message: "All users fetched successfully",
            users,
        });

    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error in getting all users",
            error,
        });
    }
};
