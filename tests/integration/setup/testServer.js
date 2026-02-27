// load test environment variables from .env.test first before other imports
import dotenv from "dotenv";

dotenv.config({ path: '.env.test' });

import express from "express";
import authRoutes from '../../../routes/authRoute.js';
import cors from "cors";

const app = express();

//middlewares
app.use(cors());
app.use(express.json());

//routes
app.use("/api/v1/auth", authRoutes);

app.get('/', (req, res) => {
    res.send("<h1>Test Server</h1>");
});

export default app;
