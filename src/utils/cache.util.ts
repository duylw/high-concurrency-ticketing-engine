import redisClient from "../config/redis.js";

const NULL_CACHE_SENTINEL = "__NULL_CACHE__";
const NULL_CACHE_TTL = 60; // 60 seconds for non-existent records
const MUTEX_LOCK_TTL = 5; // 5 seconds lock expiration

export interface CacheResult<T> {
  data: T | null;
  isFromCache: boolean;
}

/**
 * High-Performance Caching Utility
 * Implements Cache-Aside pattern, Anti-Stampede Mutex Locking, and Anti-Penetration Null Caching
 */
export const CacheUtil = {
  /**
   * Get parsed JSON value from cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const data = await redisClient.get(key);
    if (!data) return null;
    if (data === NULL_CACHE_SENTINEL) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  },

  /**
   * Set JSON value in cache with TTL
   */
  async set<T = unknown>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    await redisClient.set(key, payload, "EX", ttlSeconds);
  },

  /**
   * Delete a single key from cache
   */
  async del(key: string): Promise<void> {
    await redisClient.del(key);
  },

  /**
   * Delete all keys matching a glob pattern using SCAN (non-blocking)
   */
  async delPattern(pattern: string): Promise<void> {
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
   */
  async getOrSet<T = unknown>(
    key: string,
    ttlSeconds: number,
    fetcherFn: () => Promise<T | null | undefined>
  ): Promise<CacheResult<T>> {
    // 1. Attempt to read from Redis
    const cached = await redisClient.get(key);

    if (cached !== null) {
      if (cached === NULL_CACHE_SENTINEL) {
        return { data: null, isFromCache: true };
      }
      try {
        return { data: JSON.parse(cached) as T, isFromCache: true };
      } catch {
        return { data: cached as unknown as T, isFromCache: true };
      }
    }

    // 2. Cache Miss: Acquire Mutex Lock to prevent Cache Stampede (Thundering Herd)
    const lockKey = `lock:${key}`;
    const acquiredLock = await redisClient.set(lockKey, "1", "EX", MUTEX_LOCK_TTL, "NX");

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
        return { data: freshData as T, isFromCache: false };
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
          return { data: JSON.parse(retryCached) as T, isFromCache: true };
        } catch {
          return { data: retryCached as unknown as T, isFromCache: true };
        }
      }

      // Fallback if still not available
      const fallbackData = await fetcherFn();
      return { data: (fallbackData ?? null) as T | null, isFromCache: false };
    }
  },
};

export default CacheUtil;
