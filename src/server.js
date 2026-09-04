import { config } from "dotenv";
import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";

// Load environment variables
config();

const PORT = process.env.PORT || 5001;

/**
 * Start the HTTP server with Fail-Fast database & cache connections
 */
const startServer = async () => {
  try {
    // 1. Ensure Database & Redis connections are established before listening
    await connectDB();
    await connectRedis();

    // 2. Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`[INFO] Server is listening on http://localhost:${PORT}`);
      console.log(`[INFO] Health check: http://localhost:${PORT}/api/v1/health`);
    });

    /**
     * Graceful Shutdown Handler
     */
    const handleShutdown = async (signal) => {
      console.log(`\n[SHUTDOWN] [${signal}] received. Shutting down gracefully...`);

      server.close(async () => {
        console.log("[SHUTDOWN] HTTP server closed.");
        await disconnectDB();
        await disconnectRedis();
        console.log("[SHUTDOWN] Process terminated cleanly.");
        process.exit(0);
      });

      // Force shutdown after 10 seconds if graceful shutdown is hanging
      setTimeout(() => {
        console.error("[SHUTDOWN] Forcefully shutting down due to timeout.");
        process.exit(1);
      }, 10000);
    };

    // Listen for system termination signals
    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));

    // Catch unhandled Promise rejections and uncaught exceptions
    process.on("unhandledRejection", (err) => {
      console.error("[ERROR] Unhandled Promise Rejection:", err);
    });

    process.on("uncaughtException", (err) => {
      console.error("[ERROR] Uncaught Exception:", err);
      process.exit(1);
    });
  } catch (error) {
    console.error("[ERROR] Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
