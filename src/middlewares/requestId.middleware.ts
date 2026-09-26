import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Correlation ID (X-Request-Id) Propagation Middleware
 * - Reads existing X-Request-Id from upstream proxy (e.g. Nginx, CloudFront)
 * - Or generates a unique UUID v4 if not provided
 * - Sets req.id and writes X-Request-Id to response headers
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const headerValue = req.headers["x-request-id"];
  const requestId =
    typeof headerValue === "string" && headerValue.trim().length > 0
      ? headerValue.trim()
      : crypto.randomUUID();

  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);

  next();
};

export default requestIdMiddleware;
