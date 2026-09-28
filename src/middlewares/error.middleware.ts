import { Request, Response, NextFunction } from "express";
import { HttpStatus, HttpStatusCode } from "../constants/httpStatus.js";
import { AppError } from "../errors/AppError.js";
import { logger } from "../utils/logger.util.js";

interface PrismaErrorLike {
  code?: string;
  meta?: {
    target?: string[];
  };
}

/**
 * Handles Prisma-specific database errors and transforms them into AppError
 */
const handlePrismaError = (err: PrismaErrorLike): AppError => {
  // P2002: Unique constraint failed (e.g., duplicate email / username)
  if (err.code === "P2002") {
    const targetFields = err.meta?.target ? err.meta.target.join(", ") : "field";
    return new AppError(`A record with this ${targetFields} already exists.`, HttpStatus.CONFLICT);
  }

  // P2025: Record to update/delete not found
  if (err.code === "P2025") {
    return new AppError("The requested record was not found.", HttpStatus.NOT_FOUND);
  }

  // P2003: Foreign key constraint failed
  if (err.code === "P2003") {
    return new AppError("Invalid relation reference.", HttpStatus.BAD_REQUEST);
  }

  return new AppError("Database operation failed.", HttpStatus.INTERNAL_SERVER_ERROR);
};

/**
 * Handles JWT Token verification errors
 */
const handleJWTError = (): AppError =>
  new AppError("Invalid token. Please log in again.", HttpStatus.UNAUTHORIZED);

const handleJWTExpiredError = (): AppError =>
  new AppError("Your session has expired. Please log in again.", HttpStatus.UNAUTHORIZED);

/**
 * Global Error Handling Middleware
 */
export const errorHandler = (
  err: Error & { statusCode?: HttpStatusCode; errors?: unknown; code?: string },
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  let error: AppError | (Error & { statusCode?: HttpStatusCode; errors?: unknown }) = err;

  // 1. Transform Prisma Errors
  if (err.code && err.code.startsWith("P")) {
    error = handlePrismaError(err);
  }

  // 2. Transform JWT Errors
  if (err.name === "JsonWebTokenError") {
    error = handleJWTError();
  }
  if (err.name === "TokenExpiredError") {
    error = handleJWTExpiredError();
  }

  // 3. Set default status and code for unhandled errors
  const statusCode = (error as AppError).statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  const message = error.message || "Internal Server Error";
  const isDevelopment = process.env.NODE_ENV === "development";

  // 4. Response structure
  const response: {
    success: boolean;
    message: string;
    errors?: unknown;
    stack?: string;
  } = {
    success: false,
    message,
    ...(error.errors ? { errors: error.errors } : {}),
    ...(isDevelopment && err.stack ? { stack: err.stack } : {}),
  };

  // 5. Structured Error Logging
  const logPayload = {
    reqId: req.id || "unknown",
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode,
    err: {
      name: err.name,
      message: err.message,
      code: err.code,
      stack: isDevelopment || statusCode >= 500 ? err.stack : undefined,
    },
  };

  if (statusCode >= 500) {
    logger.error(logPayload, `[ERROR 5xx] ${req.method} ${req.originalUrl || req.url} - ${message}`);
  } else {
    logger.warn(logPayload, `[WARN ${statusCode}] ${req.method} ${req.originalUrl || req.url} - ${message}`);
  }

  return res.status(statusCode).json(response);
};
