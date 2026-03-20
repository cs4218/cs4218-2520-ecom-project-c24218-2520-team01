// load test environment variables before other imports
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

import express from "express";
import cors from "cors";

import authRoutes from "../../../routes/authRoute.js";
import categoryRoutes from "../../../routes/categoryRoutes.js";
import productRoutes from "../../../routes/productRoutes.js";
import userRoutes from "../../../routes/userRoutes.js";
const app = express();

//middlewares
app.use(cors());
app.use(express.json());

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/category", categoryRoutes);

app.get("/", (_req, res) => {
	res.send("<h1>Integration Test Server</h1>");
});

export default app;
