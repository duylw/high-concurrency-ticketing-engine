import "dotenv/config";
import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { logger } from "./utils/logger.util.js";

const PORT = parseInt(process.env.PORT || "5001", 10);

/**
 * Start the HTTP server with Fail-Fast database & cache connections
 */
const startServer = async (): Promise<void> => {
  try {
    // 1. Ensure Database & Redis connections are established before listening
    await connectDB();
    await connectRedis();

    // 2. Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info({ port: PORT }, `[SERVER] HTTP server is listening on http://localhost:${PORT}`);
      logger.info(`[SERVER] Health check endpoint: http://localhost:${PORT}/api/v1/health`);
    });

    /**
     * Graceful Shutdown Handler
     */
    const handleShutdown = async (signal: string): Promise<void> => {
      logger.info(`[SHUTDOWN] [${signal}] received. Shutting down gracefully...`);

      server.close(async () => {
        logger.info("[SHUTDOWN] HTTP server closed.");
        await disconnectDB();
        await disconnectRedis();
        logger.info("[SHUTDOWN] Process terminated cleanly.");
        process.exit(0);
      });

      // Force shutdown after 10 seconds if graceful shutdown is hanging
      setTimeout(() => {
        logger.error("[SHUTDOWN] Forcefully shutting down due to timeout.");
        process.exit(1);
      }, 10000);
    };

    // Listen for system termination signals
    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));

    // Catch unhandled Promise rejections and uncaught exceptions
    process.on("unhandledRejection", (err: unknown) => {
      logger.error({ err }, "[ERROR] Unhandled Promise Rejection");
    });

    process.on("uncaughtException", (err: Error) => {
      logger.error({ err }, "[ERROR] Uncaught Exception");
      process.exit(1);
    });
  } catch (error) {
    const err = error as Error;
    logger.error({ err }, `[ERROR] Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

startServer();
