import Redis from "ioredis";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

/**
 * Singleton Redis client instance
 * maxRetriesPerRequest is set to null as required by BullMQ
 */
const redisClient = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
});

redisClient.on("connect", () => {
  console.log("[REDIS] Connection established.");
});

redisClient.on("ready", () => {
  console.log("[REDIS] Client is ready to accept commands.");
});

redisClient.on("error", (err) => {
  console.error("[REDIS] Connection error:", err.message);
});

redisClient.on("close", () => {
  console.log("[REDIS] Connection closed.");
});

/**
 * Connect to Redis (Fail-Fast check during server startup)
 */
export const connectRedis = async () => {
  try {
    if (redisClient.status === "ready" || redisClient.status === "connect") {
      return redisClient;
    }
    await redisClient.connect();
    const pong = await redisClient.ping();
    if (pong !== "PONG") {
      throw new Error(`Unexpected ping response from Redis: ${pong}`);
    }
    return redisClient;
  } catch (error) {
    console.error("[REDIS] Failed to connect to Redis:", error.message);
    throw error;
  }
};

/**
 * Disconnect from Redis (Graceful Shutdown)
 */
export const disconnectRedis = async () => {
  try {
    if (redisClient.status !== "end") {
      await redisClient.quit();
      console.log("[REDIS] Disconnected cleanly.");
    }
  } catch (error) {
    console.error("[REDIS] Error disconnecting, forcing disconnect:", error.message);
    redisClient.disconnect();
  }
};

export { redisClient };
export default redisClient;
