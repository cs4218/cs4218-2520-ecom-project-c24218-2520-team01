import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";

import braintree from "braintree";
import dotenv from "dotenv";
import fs from "fs";
import slugify from "slugify";
import { e2ePayment } from "../tests/e2e/e2eFixturesSheen.js";

dotenv.config({
    path: process.env.NODE_ENV === "production" ? ".env" : ".env.local",
});

const isTestEnv = process.env.NODE_ENV === "test";
const isBrowserE2ETestEnv = isTestEnv && !process.env.JEST_WORKER_ID;

const hasBraintreeConfig =
    isTestEnv ||
    (process.env.BRAINTREE_MERCHANT_ID &&
        process.env.BRAINTREE_PUBLIC_KEY &&
        process.env.BRAINTREE_PRIVATE_KEY);

//payment gateway
const gateway = hasBraintreeConfig
    ? new braintree.BraintreeGateway({
          environment: braintree.Environment.Sandbox,
          merchantId: process.env.BRAINTREE_MERCHANT_ID || "test-merchant-id",
          publicKey: process.env.BRAINTREE_PUBLIC_KEY || "test-public-key",
          privateKey: process.env.BRAINTREE_PRIVATE_KEY || "test-private-key",
      })
    : null;

export const createProductController = async (req, res) => {
    try {
        const { name, description, price, category, quantity, _shipping } =
            req.fields;
        const { photo } = req.files;
        // Validation
        switch (true) {
            case !name:
                return res.status(500).send({ error: "Name is Required" });
            case !description:
                return res
                    .status(500)
                    .send({ error: "Description is Required" });
            case !price:
                return res.status(500).send({ error: "Price is Required" });
            case !category:
                return res.status(500).send({ error: "Category is Required" });
            case !quantity:
                return res.status(500).send({ error: "Quantity is Required" });
            case !photo:
                return res.status(500).send({
                    error: "Photo is Required",
                });
            case photo.size > 1000000:
                return res.status(500).send({
                    error: "Photo Should Be Smaller Than 1MB",
                });
        }

        const products = new productModel({
            ...req.fields,
            slug: slugify(name),
        });

        products.photo.data = fs.readFileSync(photo.path);
        products.photo.contentType = photo.type;

        await products.save();
        res.status(201).send({
            success: true,
            message: "Product Created Successfully",
            products,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            error,
            message: "Error in creating product",
        });
    }
};

//get all products
export const getProductController = async (_req, res) => {
    try {
        const products = await productModel
            .find({})
            .populate("category")
            .select("-photo")
            .limit(12)
            .sort({ createdAt: -1 });
        res.status(200).send({
            success: true,
            counTotal: products.length,
            message: "All Products: ",
            products,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error in getting products",
            error: error.message,
        });
    }
};
// get single product
export const getSingleProductController = async (req, res) => {
    try {
        const product = await productModel
            .findOne({ slug: req.params.slug })
            .select("-photo")
            .populate("category");

        if (!product) {
            res.status(404).send({
                success: false,
                message: "Product not found",
            });
            return;
        }
        res.status(200).send({
            success: true,
            message: "Single Product Fetched",
            product,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error while getting single product",
            error,
        });
    }
};

// get photo
export const productPhotoController = async (req, res) => {
    try {
        const product = await productModel
            .findById(req.params.pid)
            .select("photo");

        if (!product) {
            return res.status(404).send({
                success: false,
                message: "Product not found",
            });
        }
        if (product.photo.data) {
            res.set("Content-type", product.photo.contentType);
            return res.status(200).send(product.photo.data);
        } else {
            return res.status(404).send({
                success: false,
                message: "No photo available",
            });
        }
    } catch (error) {
        res.status(500).send({
            success: false,
            message: "Error while getting photo",
            error,
        });
    }
};

//delete controller
export const deleteProductController = async (req, res) => {
    try {
        const { pid } = req.params;

        if (!pid) {
            res.status(400).send({
                success: false,
                message: "Product ID is required",
            });
            return;
        }

        const product = await productModel.findByIdAndDelete(req.params.pid);

        if (!product) {
            res.status(404).send({
                success: false,
                message: "Product does not exist",
            });
            return;
        }

        res.status(200).send({
            success: true,
            message: "Product deleted successfully",
            product,
        });
    } catch (error) {
        console.log(error);

        if (error.name === "CastError") {
            res.status(400).send({
                success: false,
                message: "Invalid product ID format",
                error,
            });
            return;
        }

        res.status(500).send({
            success: false,
            message: "Error while deleting product",
            error,
        });
    }
};

//update products
export const updateProductController = async (req, res) => {
    try {
        const { pid } = req.params;
        const { name, description, price, category, quantity, _shipping } =
            req.fields;
        const { photo } = req.files;
        // validation
        switch (true) {
            case !pid:
                return res.status(500).send({ error: "PID is Required" });
            case !name:
                return res.status(500).send({ error: "Name is Required" });
            case !description:
                return res
                    .status(500)
                    .send({ error: "Description is Required" });
            case !price:
                return res.status(500).send({ error: "Price is Required" });
            case !category:
                return res.status(500).send({ error: "Category is Required" });
            case !quantity:
                return res.status(500).send({ error: "Quantity is Required" });
            case !photo:
                return res.status(500).send({
                    error: "Photo is Required",
                });
            case photo && photo.size > 1000000:
                return res.status(500).send({
                    error: "Photo Should Be Smaller Than 1MB",
                });
        }

        const products = await productModel.findByIdAndUpdate(
            req.params.pid,
            { ...req.fields, slug: slugify(name) },
            { new: true },
        );

        if (photo) {
            products.photo.data = fs.readFileSync(photo.path);
            products.photo.contentType = photo.type;
        }

        await products.save();
        res.status(201).send({
            success: true,
            message: "Product Updated Successfully",
            products,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            error,
            message: "Error in updating product",
        });
    }
};

// filters
export const productFiltersController = async (req, res) => {
    try {
        const { checked = [], radio = [] } = req.body;
        let args = {};
        if (checked.length > 0) args.category = checked;
        if (radio.length) args.price = { $gte: radio[0], $lte: radio[1] };
        console.log(args);
        const products = await productModel.find(args);
        res.status(200).send({
            success: true,
            products,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error while filtering products",
            error,
        });
    }
};

// product count
export const productCountController = async (req, res) => {
    try {
        const total = await productModel.find({}).estimatedDocumentCount();
        res.status(200).send({
            success: true,
            total,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            message: "Error in product count",
            error,
            success: false,
        });
    }
};

// product list base on page
export const productListController = async (req, res) => {
    try {
        const perPage = 6;
        const page = parseInt(req.params.page);
        if (!page || page < 1) throw new Error("Invalid page number");

        const products = await productModel
            .find({})
            .select("-photo")
            .skip((page - 1) * perPage)
            .limit(perPage)
            .sort({ createdAt: -1 });
        res.status(200).send({
            success: true,
            products,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "error in per page ctrl",
            error,
        });
    }
};

// search product
export const searchProductController = async (req, res) => {
    try {
        const { keyword } = req.params;
        const results = await productModel
            .find({
                $or: [
                    { name: { $regex: keyword, $options: "i" } },
                    { description: { $regex: keyword, $options: "i" } },
                ],
            })
            .select("-photo");
        res.json(results);
    } catch (error) {
        console.log(error);
        res.status(400).send({
            success: false,
            message: "Error In Search Product API",
            error,
        });
    }
};

// similar products
export const relatedProductController = async (req, res) => {
    try {
        const { pid, cid } = req.params;
        const products = await productModel
            .find({
                category: cid,
                _id: { $ne: pid },
            })
            .select("-photo")
            .limit(3)
            .populate("category");
        res.status(200).send({
            success: true,
            products,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error while getting related product",
            error,
        });
    }
};

// get prdocyst by catgory
// TODO: Pagination for CategoryProduct frontend
export const productCategoryController = async (req, res) => {
    try {
        const category = await categoryModel.findOne({ slug: req.params.slug });
        const products = await productModel
            .find({ category })
            .populate("category");
        res.status(200).send({
            success: true,
            category,
            products,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            error,
            message: "Error while getting products",
        });
    }
};

// From this line onwards: Bugs fixed by Nicholas Cheng, A0269648H

//payment gateway api
//token
export const braintreeTokenController = async (req, res) => {
    try {
        if (isBrowserE2ETestEnv) {
            return res.status(200).send({
                success: true,
                clientToken: e2ePayment.clientToken,
            });
        }
        gateway.clientToken.generate({}, function (error, response) {
            if (error) {
                res.status(500).send({
                    success: false,
                    message: "Error while generating token",
                    error,
                });
            } else {
                res.status(200).send({
                    success: true,
                    clientToken: response.clientToken,
                });
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error with braintree",
            error,
        });
    }
};

//payment
export const brainTreePaymentController = async (req, res) => {
    try {
        const { nonce, cart } = req.body;
        if (!nonce) {
            return res.status(400).send({
                success: false,
                message: "Payment method nonce is not provided",
            });
        }

        if (!req.user || !req.user._id) {
            return res.status(400).send({
                success: false,
                message: "User id is not provided",
            });
        }

        if (!cart || cart.length == 0) {
            return res.status(400).send({
                success: false,
                message: "No transaction is made because cart is empty",
            });
        }
        let total = 0;
        cart.map((i) => {
            total += i.price;
        });
        /**
         * AI Usage Declaration
         *
         * Tool Used: GPT-5.4
         *
         * Prompt:
         * - Asked for reference ideas on how to add config for mock paymnent
         *
         * How the AI Output Was Used:
         * - Used the suggestions on the mock payment config
         *  */

        if (isBrowserE2ETestEnv && nonce === e2ePayment.nonce) {
            const order = await new orderModel({
                products: cart.map((item) => item._id ?? item),
                payment: {
                    id: e2ePayment.transactionId,
                    success: true,
                    status: "submitted_for_settlement",
                    amount: total,
                },
                buyer: req.user._id,
            }).save();

            return res.status(200).json({
                ok: true,
                orderId: order._id,
            });
        }

        gateway.transaction.sale(
            {
                amount: total,
                paymentMethodNonce: nonce,
                options: {
                    submitForSettlement: true,
                },
            },
            async function (error, result) {
                if (result) {
                    await new orderModel({
                        products: cart.map((item) => item._id ?? item),
                        payment: result,
                        buyer: req.user._id,
                    }).save();
                    return res.status(200).json({ ok: true });
                } else {
                    return res.status(500).send({
                        success: false,
                        message: "Error while making transaction",
                        error,
                    });
                }
            },
        );
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error with braintree",
            error,
        });
    }
};
