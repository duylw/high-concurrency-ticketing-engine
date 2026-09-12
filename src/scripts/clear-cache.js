import { config } from "dotenv";
config();

import { connectRedis, disconnectRedis, redisClient } from "../config/redis.js";

const clearCache = async () => {
  console.log(`\n======================================================`);
  console.log(`[CACHE CLEAR] Clearing Redis Cache & Rate Limit Keys...`);
  console.log(`======================================================`);

  try {
    await connectRedis();

    // Option: flush current db (flushes cache, rate limits, ephemeral locks)
    await redisClient.flushdb();

    console.log(`[PASSED] Redis Cache & Rate Limit keys cleared successfully!`);
    console.log(`[INFO] You can now login, test APIs, and reload without 429 rate limit errors.`);
  } catch (error) {
    console.error(`[ERROR] Failed to clear Redis cache:`, error.message);
    process.exit(1);
  } finally {
    await disconnectRedis();
    process.exit(0);
  }
};

clearCache();
