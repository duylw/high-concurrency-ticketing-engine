import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.util.js";

/**
 * HTTP Access Logging Middleware
 * - Records latency (durationMs) when response completes
 * - Propagates reqId, client IP, HTTP method, URL, and status code
 * - Classifies log levels:
 *   - 2xx / 3xx: logger.info
 *   - 4xx (Client Errors): logger.warn
 *   - 5xx (Server Errors): logger.error
 */
export const httpLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const reqId = req.id || "unknown";
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";

    const logPayload = {
      reqId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      durationMs,
      clientIp,
    };

    const logMessage = `[HTTP] ${req.method} ${req.originalUrl || req.url} ${statusCode} (${durationMs}ms)`;

    if (statusCode >= 500) {
      logger.error(logPayload, logMessage);
    } else if (statusCode >= 400) {
      logger.warn(logPayload, logMessage);
    } else {
      logger.info(logPayload, logMessage);
    }
  });

  next();
};

export default httpLoggingMiddleware;
