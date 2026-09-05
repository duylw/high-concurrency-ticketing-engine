import redisClient from "../config/redis.js";

const NULL_CACHE_SENTINEL = "__NULL_CACHE__";
const NULL_CACHE_TTL = 60; // 60 seconds for non-existent records
const MUTEX_LOCK_TTL = 5; // 5 seconds lock expiration

/**
 * High-Performance Caching Utility
 * Implements Cache-Aside pattern, Anti-Stampede Mutex Locking, and Anti-Penetration Null Caching
 */
export const CacheUtil = {
  /**
   * Get parsed JSON value from cache
   *
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    const data = await redisClient.get(key);
    if (!data) return null;
    if (data === NULL_CACHE_SENTINEL) return null;
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  },

  /**
   * Set JSON value in cache with TTL
   *
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds
   */
  async set(key, value, ttlSeconds = 3600) {
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    await redisClient.set(key, payload, "EX", ttlSeconds);
  },

  /**
   * Delete a single key from cache
   *
   * @param {string} key
   */
  async del(key) {
    await redisClient.del(key);
  },

  /**
   * Delete all keys matching a glob pattern using SCAN (non-blocking)
   *
   * @param {string} pattern - e.g. 'events:*'
   */
  async delPattern(pattern) {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redisClient.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== "0");
  },

  /**
   * Cache-Aside orchestrator with Mutex Lock and Null Caching
   *
   * @param {string} key - Cache key
   * @param {number} ttlSeconds - Cache TTL in seconds
   * @param {Function} fetcherFn - Async function returning fresh data from Database
   * @returns {Promise<{ data: any, isFromCache: boolean }>}
   */
  async getOrSet(key, ttlSeconds, fetcherFn) {
    // 1. Attempt to read from Redis
    const cached = await redisClient.get(key);

    if (cached !== null) {
      if (cached === NULL_CACHE_SENTINEL) {
        return { data: null, isFromCache: true };
      }
      try {
        return { data: JSON.parse(cached), isFromCache: true };
      } catch {
        return { data: cached, isFromCache: true };
      }
    }

    // 2. Cache Miss: Acquire Mutex Lock to prevent Cache Stampede (Thundering Herd)
    const lockKey = `lock:${key}`;
    const acquiredLock = await redisClient.set(lockKey, "1", "NX", "EX", MUTEX_LOCK_TTL);

    if (acquiredLock === "OK") {
      try {
        // Fetch fresh data from Database
        const freshData = await fetcherFn();

        if (freshData === null || freshData === undefined) {
          // Cache Penetration defense: Cache sentinel value with short TTL
          await redisClient.set(key, NULL_CACHE_SENTINEL, "EX", NULL_CACHE_TTL);
          return { data: null, isFromCache: false };
        }

        // Cache fresh data in Redis
        await redisClient.set(key, JSON.stringify(freshData), "EX", ttlSeconds);
        return { data: freshData, isFromCache: false };
      } finally {
        // Release Mutex Lock
        await redisClient.del(lockKey);
      }
    } else {
      // 3. Mutex Lock held by another request: Wait 50ms and retry reading from cache
      await new Promise((resolve) => setTimeout(resolve, 50));
      const retryCached = await redisClient.get(key);
      if (retryCached !== null) {
        if (retryCached === NULL_CACHE_SENTINEL) {
          return { data: null, isFromCache: true };
        }
        try {
          return { data: JSON.parse(retryCached), isFromCache: true };
        } catch {
          return { data: retryCached, isFromCache: true };
        }
      }

      // Fallback if still not available
      const fallbackData = await fetcherFn();
      return { data: fallbackData, isFromCache: false };
    }
  },
};

export default CacheUtil;
