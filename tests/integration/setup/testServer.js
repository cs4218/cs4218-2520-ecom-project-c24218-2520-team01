import express from "express";
import cors from "cors";

import authRoutes from "../../../routes/authRoute.js";
import categoryRoutes from "../../../routes/categoryRoutes.js";
import productRoutes from "../../../routes/productRoutes.js";
import userRoutes from "../../../routes/userRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);

app.get("/", (_req, res) => {
  res.send("<h1>Integration Test Server</h1>");
});

export default app;
