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
      // Add the custom validators to check for empty array and existing products.
      validate: [
        {
          validator: function (productsList) {
            return productsList && productsList.length > 0;
          },
          message: "An order must contain at least one product."
        },
        {
          validator: async function (productsList) {
            for (const productId of productsList) {
              const existingProduct = await mongoose.model("Products").findOne({ _id: productId });
              if (!existingProduct) {
                return false;
              }
            }
            return true;
          },
          message: "One or more product IDs provided do not exist in the database."
        },
      ],
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