import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from './routes/authRoute.js'
import categoryRoutes from './routes/categoryRoutes.js'
import productRoutes from './routes/productRoutes.js'
import uiTestingSetupSheen from "./tests/e2e/UiTestingSetupSheen.js";
import userRoutes from './routes/userRoutes.js'
import cors from "cors";

// configure env
dotenv.config({
    path: process.env.NODE_ENV === "production" ? ".env" : ".env.local",
});

const isBrowserE2ETestEnv =
	process.env.NODE_ENV === "test" && !process.env.JEST_WORKER_ID;

const app = express();

//middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);
if (isBrowserE2ETestEnv) {
	app.use("/api/v1/testing", uiTestingSetupSheen);
}

// rest api

app.get("/", (req, res) => {
    res.send("<h1>Welcome to ecommerce app</h1>");
});

const PORT = process.env.PORT || 6060;

const startServer = async () => {
	await connectDB();

app.listen(PORT, () => {
		console.log(
			`Server running on ${process.env.DEV_MODE} mode on ${PORT}`.bgCyan.white,
		);
	});
};

startServer();
