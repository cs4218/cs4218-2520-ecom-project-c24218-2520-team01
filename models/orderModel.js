import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    products: {
      type: [
        {
          type: mongoose.ObjectId,
          ref: "Products",
        }
      ],
      // Add the custom validator to check the array length
      validate: {
        validator: function (value) {
          return value && value.length > 0;
        },
        message: "An order must contain at least one product."
      }
    },
    payment: {},
    buyer: {
      type: mongoose.ObjectId,
      ref: "users",
    },
    status: {
      type: String,
      default: "Not Process",
      enum: ["Not Process", "Processing", "Shipped", "deliverd", "cancel"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);