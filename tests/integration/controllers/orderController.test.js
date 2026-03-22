// muhammad ZAIDAN bin sani (A0273278U)

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
    getAllOrdersController,
    getOrdersController,
    orderStatusController,
} from "../../../controllers/authController.js";
import orderModel from "../../../models/orderModel.js";
import productModel from "../../../models/productModel.js";
import userModel from "../../../models/userModel.js";

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    return res;
};

let mongod;

const categoryId = new mongoose.Types.ObjectId();
const STATUSES = [
    "Not Process",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancel",
];
let users, products, orders;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
});

beforeEach(async () => {
    users = await userModel.insertMany(
        Array.from({ length: 3 }, (_, i) => ({
            name: `Buyer ${i + 1}`,
            email: `buyer${i + 1}@example.com`,
            password: "hashedpassword",
            phone: `9000000${i + 1}`,
            address: { street: `${i + 1} Test St`, city: "Singapore" },
            answer: "test answer",
            role: 0,
        })),
    );

    products = await productModel.insertMany(
        Array.from({ length: 4 }, (_, i) => ({
            name: `Product ${i + 1}`,
            slug: `product-${i + 1}`,
            description: `Description for product ${i + 1}`,
            price: (i + 1) * 10,
            category: categoryId,
            quantity: (i + 1) * 5,
            shipping: true,
        })),
    );

    orders = await orderModel.insertMany(
        Array.from({ length: 4 }, (_, i) => ({
            products: [products[i]._id],
            payment: { success: true, transactionId: `txn_test_00${i + 1}` },
            buyer: users[Math.floor(i / 2)]._id,
            status: STATUSES[i],
        })),
    );
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

afterEach(async () => {
    await Promise.all([
        orderModel.deleteMany({}),
        userModel.deleteMany({}),
        productModel.deleteMany({}),
    ]);
});

describe("getOrdersController", () => {
    it("returns 200 with correct products of the user", async () => {
        const user = users[0];
        const req = { user };
        const res = mockRes();

        await getOrdersController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];

        // all orders belong to user
        expect(
            body.every((o) => o.buyer._id.toString() === user._id.toString()),
        ).toBe(true);

        // all user orders returned
        const userOrderIds = orders.slice(0, 2).map((o) => o._id.toString());
        expect(body.map((o) => o._id.toString()).sort()).toEqual(
            userOrderIds.sort(),
        );

        // only buyer name field populated
        body.forEach((o) => {
            const buyerKeys = Object.keys(o.buyer.toObject());
            expect(buyerKeys).toContain("name");
            expect(buyerKeys).not.toContain("password");
            expect(buyerKeys).not.toContain("email");
        });

        // photo not populated for products
        body.forEach((o) => {
            o.products.forEach((p) => {
                const productKeys = Object.keys(p.toObject());
                expect(productKeys).not.toHaveProperty("photo");
            });
        });
    });

    it("returns 200 with empty array if user has no order", async () => {
        const user = users[2];
        const req = { user };
        const res = mockRes();

        await getOrdersController(req, res);

        const body = res.json.mock.calls[0][0];
        expect(res.status).toHaveBeenCalledWith(200);
        expect(body).toHaveLength(0);
    });
});

describe("getAllOrdersController", () => {
    it("returns 200 with all orders", async () => {
        const req = {};
        const res = mockRes();

        await getAllOrdersController(req, res);

        const body = res.json.mock.calls[0][0];

        expect(res.status).toHaveBeenCalledWith(200);
        expect(body.length).toBe(4);

        body.forEach((o) => {
            const buyerKeys = Object.keys(o.buyer.toObject());
            expect(buyerKeys).toContain("name");
            expect(buyerKeys).not.toContain("password");
            expect(buyerKeys).not.toContain("email");
        });

        // photo not populated for products
        body.forEach((o) => {
            o.products.forEach((p) => {
                const productKeys = Object.keys(p.toObject());
                expect(productKeys).not.toHaveProperty("photo");
            });
        });
    });
});

describe("orderStatusController", () => {
    it("returns 200, and status is persisted", async () => {
        const req = {
            params: { orderId: orders[0]._id },
            body: { status: "Cancel" },
        };
        const res = mockRes();

        await orderStatusController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const returned = res.json.mock.calls[0][0];
        expect(returned.status).toBe("Cancel");
        const persisted = await orderModel.findById(orders[0]._id);
        expect(persisted.status).toBe("Cancel");
    });

    it("returns 422 with invalid enum", async () => {
        const req = {
            params: { orderId: orders[0]._id },
            body: { status: "invalid status" },
        };
        const res = mockRes();

        await orderStatusController(req, res);

        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({ success: false }),
        );
        const persisted = await orderModel.findById(orders[0]._id);
        expect(persisted.status).toBe("Not Process");
    });
});
