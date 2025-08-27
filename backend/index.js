import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import experienceRoutes from "./routes/experience.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:3000" 
}));

app.use(bodyParser.json());
app.use("/api/experiences", experienceRoutes);

const PORT = 5001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
