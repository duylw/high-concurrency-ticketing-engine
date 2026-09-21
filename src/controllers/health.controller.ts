import { Request, Response } from "express";
import { prismaClient } from "../config/db.js";
import { redisClient } from "../config/redis.js";
import { ticketReleaseQueue, notificationQueue } from "../config/queue.js";

interface ServiceChecks {
  database: { status: string; latencyMs: number | null; error: string | null };
  redis: { status: string; latencyMs: number | null; response: string | null; error: string | null };
  queues: {
    ticketRelease?: { status: string; counts: unknown };
    notification?: { status: string; counts: unknown };
    error?: string;
  };
}

/**
 * Deep Health Check Controller
 * Inspects real-time connectivity and latency for PostgreSQL, Redis, and BullMQ queues
 */
export const getDeepHealth = async (_req: Request, res: Response): Promise<Response> => {
  const startTime = Date.now();
  const checks: ServiceChecks = {
    database: { status: "down", latencyMs: null, error: null },
    redis: { status: "down", latencyMs: null, response: null, error: null },
    queues: {},
  };

  let isHealthy = true;

  // 1. Check PostgreSQL Connectivity & Measure Latency
  try {
    const dbStart = Date.now();
    await prismaClient.$queryRaw`SELECT 1`;
    checks.database.status = "up";
    checks.database.latencyMs = Date.now() - dbStart;
  } catch (err) {
    isHealthy = false;
    checks.database.status = "down";
    checks.database.error = (err as Error).message;
  }

  // 2. Check Redis Ping & Measure Latency
  try {
    const redisStart = Date.now();
    const pingResponse = await redisClient.ping();
    checks.redis.latencyMs = Date.now() - redisStart;
    if (pingResponse === "PONG") {
      checks.redis.status = "up";
      checks.redis.response = "PONG";
    } else {
      isHealthy = false;
      checks.redis.status = "degraded";
      checks.redis.response = pingResponse;
    }
  } catch (err) {
    isHealthy = false;
    checks.redis.status = "down";
    checks.redis.error = (err as Error).message;
  }

  // 3. Inspect BullMQ Queue Job Depths
  try {
    const [ticketReleaseCounts, notificationCounts] = await Promise.all([
      ticketReleaseQueue.getJobCounts("waiting", "active", "delayed", "failed"),
      notificationQueue.getJobCounts("waiting", "active", "delayed", "failed"),
    ]);

    checks.queues.ticketRelease = { status: "up", counts: ticketReleaseCounts };
    checks.queues.notification = { status: "up", counts: notificationCounts };
  } catch (err) {
    checks.queues.error = (err as Error).message;
  }

  // 4. Capture System Memory & Uptime
  const memoryUsage = process.memoryUsage();
  const systemInfo = {
    uptime: `${process.uptime().toFixed(2)}s`,
    environment: process.env.NODE_ENV || "development",
    nodeVersion: process.version,
    memory: {
      rssMB: +(memoryUsage.rss / (1024 * 1024)).toFixed(2),
      heapUsedMB: +(memoryUsage.heapUsed / (1024 * 1024)).toFixed(2),
      heapTotalMB: +(memoryUsage.heapTotal / (1024 * 1024)).toFixed(2),
    },
    totalCheckDurationMs: Date.now() - startTime,
  };

  const statusCode = isHealthy ? 200 : 503;
  const overallStatus = isHealthy ? "healthy" : "unhealthy";

  return res.status(statusCode).json({
    success: isHealthy,
    status: overallStatus,
    timestamp: new Date().toISOString(),
    system: systemInfo,
    services: checks,
  });
};
