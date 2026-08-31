import { HttpStatus } from "../constants/httpStatus.js";
import { AppError } from "../errors/AppError.js";

/**
 * Handles Prisma-specific database errors and transforms them into AppError
 */
const handlePrismaError = (err) => {
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
const handleJWTError = () => new AppError("Invalid token. Please log in again.", HttpStatus.UNAUTHORIZED);

const handleJWTExpiredError = () =>
  new AppError("Your session has expired. Please log in again.", HttpStatus.UNAUTHORIZED);

/**
 * Global Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

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
  const statusCode = error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  const message = error.message || "Internal Server Error";
  const isDevelopment = process.env.NODE_ENV === "development";

  // 4. Response structure
  const response = {
    success: false,
    message,
    ...(error.errors && { errors: error.errors }),
    ...(isDevelopment && { stack: err.stack }), // Only include stack trace in development
  };

  // 5. Log error to console in development or if it's a 500 bug
  if (statusCode >= 500) {
    console.error("[Unhandled Error]:", err);
  }

  return res.status(statusCode).json(response);
};
