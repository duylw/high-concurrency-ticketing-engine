import express from "express";
import { config } from "dotenv";
import { connectDB, disconnectDB } from "./config/db.js";

config();

const app = express();
const PORT = process.env.PORT || 5001;

const startServer = async () => {
    try {
        await connectDB();

        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        const handleShutdown = async (signal) => {
            console.log(`\n${signal} received. Shutting down gracefully...`);
            server.close(async () => {
                console.log("HTTP server closed.");
                await disconnectDB();
                process.exit(0);
            });
        };

        process.on("SIGINT", () => handleShutdown("SIGINT"));
        process.on("SIGTERM", () => handleShutdown("SIGTERM"));

    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();
