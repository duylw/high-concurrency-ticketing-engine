import "dotenv/config";
import { connectDB, disconnectDB } from "./config/db.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { ticketReleaseWorker } from "./workers/ticketRelease.worker.js";
import { notificationWorker } from "./workers/notification.worker.js";

/**
 * Dedicated BullMQ Background Worker Process
 * Operates independently from the HTTP API server.
 */
const startWorker = async (): Promise<void> => {
  try {
    console.log("[WORKER PROCESS] Initializing dedicated background worker...");

    // 1. Establish persistent DB & Redis connections
    await connectDB();
    await connectRedis();

    console.log("[WORKER PROCESS] Database & Redis connected successfully.");
    console.log("[WORKER PROCESS] ticketReleaseWorker listening on queue: ticket-release");
    console.log("[WORKER PROCESS] notificationWorker listening on queue: notification");

    /**
     * Graceful Shutdown Handler
     */
    const handleShutdown = async (signal: string): Promise<void> => {
      console.log(`\n[WORKER PROCESS] [${signal}] received. Shutting down workers gracefully...`);

      try {
        await ticketReleaseWorker.close();
        console.log("[WORKER PROCESS] ticketReleaseWorker closed.");

        await notificationWorker.close();
        console.log("[WORKER PROCESS] notificationWorker closed.");

        await disconnectDB();
        await disconnectRedis();

        console.log("[WORKER PROCESS] All worker connections terminated cleanly.");
        process.exit(0);
      } catch (err) {
        const error = err as Error;
        console.error("[WORKER PROCESS] Error during shutdown:", error.message);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));

    process.on("unhandledRejection", (err: unknown) => {
      console.error("[WORKER ERROR] Unhandled Promise Rejection:", err);
    });

    process.on("uncaughtException", (err: Error) => {
      console.error("[WORKER ERROR] Uncaught Exception:", err);
      process.exit(1);
    });
  } catch (error) {
    const err = error as Error;
    console.error("[WORKER PROCESS] Initialization failed:", err.message);
    process.exit(1);
  }
};

startWorker();
