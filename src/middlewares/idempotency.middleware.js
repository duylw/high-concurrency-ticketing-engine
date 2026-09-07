import { CacheKeys } from "../constants/cacheKeys.js";
import { CacheUtil } from "../utils/cache.util.js";
import { BadRequestError, ConflictError } from "../errors/AppError.js";
import redisClient from "../config/redis.js";

export const idempotencyMiddleware = async (req, res, next) => {

    try {
        const idempotencyKey = req.get("x-idempotency-key") || req.get("idempotency-key");

        if (!idempotencyKey) {
            return next(new BadRequestError('Missing idempotency-key header'));
        }

        const redisKey = CacheKeys.IDEMPOTENCY(idempotencyKey);

        const data = await CacheUtil.get(redisKey);

        if (data?.status === "IN_PROGRESS") {
            return next(new ConflictError("A request with this idempotency key is currently in progress. Please wait."));
        }
        else if (data?.status === "COMPLETED") {
            res.set("x-idempotent-replayed", "true");
            return res.status(data.statusCode).json(data.response);
        }
        else if (data?.status === "FAILED") {
            return next(new Error(data.error));
        }

        const acquired = await redisClient.set(
            redisKey,
            JSON.stringify({ status: "IN_PROGRESS" }),
            "EX",
            120,
            "NX"
        );

        if (!acquired) {
            return next(new ConflictError("A request with this idempotency key is currently in progress. Please wait."));
        }

        // Monkey Patch res.json
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                redisClient.set(
                    redisKey,
                    JSON.stringify({
                        status: "COMPLETED",
                        statusCode: res.statusCode,
                        response: body,
                    }),
                    "EX",
                    86400
                ).catch((err) => console.error("[IDEMPOTENCY] Cache error:", err));
            } else {
                redisClient.del(redisKey).catch((err) => console.error("[IDEMPOTENCY] Unlock error:", err));
            }
            return originalJson(body);
        };
        next();
    } catch (error) {
        console.error("[IDEMPOTENCY] Middleware error:", error);
        return next(error);
    }
}