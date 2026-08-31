import { HttpStatus } from "../constants/httpStatus.js";

/**
 * Base Application Error class for operational errors
 */
export class AppError extends Error {
  constructor(message, statusCode = HttpStatus.INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; // Distinguish operational errors from programming bugs

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request Error
 */
export class BadRequestError extends AppError {
  constructor(message = "Bad Request", errors = null) {
    super(message, HttpStatus.BAD_REQUEST);
    this.errors = errors;
  }
}

/**
 * 401 Unauthorized Error (Authentication failed)
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized access") {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

/**
 * 403 Forbidden Error (Permission denied)
 */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden resource") {
    super(message, HttpStatus.FORBIDDEN);
  }
}

/**
 * 404 Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, HttpStatus.NOT_FOUND);
  }
}

/**
 * 409 Conflict Error (Duplicate email, username, etc.)
 */
export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, HttpStatus.CONFLICT);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message = "Internal server error") {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
