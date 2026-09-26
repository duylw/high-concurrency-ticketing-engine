import "dotenv/config";
import { connectDB, disconnectDB } from "./config/db.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { ticketReleaseWorker } from "./workers/ticketRelease.worker.js";
import { notificationWorker } from "./workers/notification.worker.js";
import { logger } from "./utils/logger.util.js";

/**
 * Dedicated BullMQ Background Worker Process
 * Operates independently from the HTTP API server.
 */
const startWorker = async (): Promise<void> => {
  try {
    logger.info("[WORKER PROCESS] Initializing dedicated background worker...");

    // 1. Establish persistent DB & Redis connections
    await connectDB();
    await connectRedis();

    logger.info("[WORKER PROCESS] Database & Redis connected successfully.");
    logger.info("[WORKER PROCESS] ticketReleaseWorker listening on queue: ticket-release");
    logger.info("[WORKER PROCESS] notificationWorker listening on queue: notification");

    /**
     * Graceful Shutdown Handler
     */
    const handleShutdown = async (signal: string): Promise<void> => {
      logger.info(`[WORKER PROCESS] [${signal}] received. Shutting down workers gracefully...`);

      try {
        await ticketReleaseWorker.close();
        logger.info("[WORKER PROCESS] ticketReleaseWorker closed.");

        await notificationWorker.close();
        logger.info("[WORKER PROCESS] notificationWorker closed.");

        await disconnectDB();
        await disconnectRedis();

        logger.info("[WORKER PROCESS] All worker connections terminated cleanly.");
        process.exit(0);
      } catch (err) {
        const error = err as Error;
        logger.error({ err }, `[WORKER PROCESS] Error during shutdown: ${error.message}`);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));

    process.on("unhandledRejection", (err: unknown) => {
      logger.error({ err }, "[WORKER ERROR] Unhandled Promise Rejection");
    });

    process.on("uncaughtException", (err: Error) => {
      logger.error({ err }, "[WORKER ERROR] Uncaught Exception");
      process.exit(1);
    });
  } catch (error) {
    const err = error as Error;
    logger.error({ err }, `[WORKER PROCESS] Initialization failed: ${err.message}`);
    process.exit(1);
  }
};

startWorker();
