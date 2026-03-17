// muhammad ZAIDAN bin sani (A0273278U)

import mongoose from "mongoose";
import productModel from "./productModel.js";

describe("productModel schema", () => {
    // Helper to build a valid product object
    const validProduct = () => ({
        name: "Test Laptop",
        slug: "test-laptop",
        description: "A great laptop",
        price: 999,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
    });

    describe("required fields", () => {
        it("validates successfully with all required fields", () => {
            const doc = new productModel(validProduct());
            const err = doc.validateSync();
            expect(err).toBeUndefined();
        });

        it.each([
            "name",
            "slug",
            "description",
            "price",
            "category",
            "quantity",
        ])("fails validation when %s is missing", (field) => {
            const data = validProduct();
            delete data[field];
            const doc = new productModel(data);
            const err = doc.validateSync();
            expect(err.errors[field]).toBeDefined();
        });
    });

    describe("field types", () => {
        it("casts price to Number", () => {
            const doc = new productModel({ ...validProduct(), price: "20" });
            expect(doc.price).toBe(20);
        });

        it("rejects non-numeric price", () => {
            const doc = new productModel({
                ...validProduct(),
                price: "twenty",
            });
            const err = doc.validateSync();
            expect(err.errors.price).toBeDefined();
        });

        it("casts quantity to Number", () => {
            const doc = new productModel({ ...validProduct(), quantity: "20" });
            expect(doc.quantity).toBe(20);
        });

        it("treats shipping as optional (no error when omitted)", () => {
            const doc = new productModel(validProduct());
            const err = doc.validateSync();
            expect(err).toBeUndefined();
            expect(doc.shipping).toBeUndefined();
        });

        it("casts shipping to Boolean", () => {
            const doc = new productModel({
                ...validProduct(),
                shipping: "true",
            });
            expect(doc.shipping).toBe(true);
        });
    });

    describe("photo field", () => {
        it("accepts photo with data and contentType", () => {
            const doc = new productModel({
                ...validProduct(),
                photo: { data: Buffer.from("img"), contentType: "image/jpeg" },
            });
            const err = doc.validateSync();
            expect(err).toBeUndefined();
            expect(doc.photo.contentType).toBe("image/jpeg");
        });

        it("is optional (no error when photo is omitted)", () => {
            const doc = new productModel(validProduct());
            const err = doc.validateSync();
            expect(err).toBeUndefined();
        });
    });

    describe("schema metadata", () => {
        it("has timestamps enabled (createdAt/updatedAt paths exist)", () => {
            expect(productModel.schema.paths.createdAt).toBeDefined();
            expect(productModel.schema.paths.updatedAt).toBeDefined();
        });

        it("category field references the Category model", () => {
            const categoryPath = productModel.schema.paths.category;
            expect(categoryPath.options.ref).toBe("Category");
        });

        it("is registered under the Products model name", () => {
            expect(productModel.modelName).toBe("Products");
        });
    });
});
