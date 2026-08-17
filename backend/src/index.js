import express from "express";
import dotenv from "dotenv";
dotenv.config();

import cookieParser from "cookie-parser";
import cors from "cors";

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";
import { enableTerminalLogging, requestLogger } from "./lib/logger.js";

enableTerminalLogging();

const PORT = process.env.PORT || 5001;

app.set("trust proxy", 1);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(requestLogger);

// FIX: Safely strip trailing slashes from environment URLs (e.g., https://app.vercel.app/ -> https://app.vercel.app)
const parseAllowedOrigins = () =>
  (process.env.CLIENT_URL || process.env.FRONTEND_URL || "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowedOrigins = parseAllowedOrigins();
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin === "http://localhost:5173" ||
        origin === "http://localhost:3000" ||
        origin === "http://127.0.0.1:5173";

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

server.on("error", (error) => {
  console.error("Server startup error:", error);
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the existing process or choose another port.`,
    );
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});
