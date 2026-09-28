import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../config/redis.js";

/**
 * Rate Limiter for Authentication endpoints (Login & Register)
 * Limits requests per IP using Redis to prevent brute-force attacks
 */
const defaultMax = process.env.NODE_ENV === "production" ? 20 : 1000;
const authMax = process.env.RATE_LIMIT_AUTH_MAX
  ? parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10)
  : defaultMax;
const authWindowMs = process.env.RATE_LIMIT_AUTH_WINDOW_MS
  ? parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10)
  : 15 * 60 * 1000;

export const authRateLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: ((...args: string[]) =>
      (redisClient.call as (...a: string[]) => Promise<unknown>)(...args)) as never,
    prefix: "rl:auth:",
  }),
  handler: (_req, res) => {
    const minutes = Math.round(authWindowMs / 60000);
    return res.status(429).json({
      success: false,
      message: `Too many authentication attempts. Please try again after ${minutes} minutes.`,
    });
  },
});
