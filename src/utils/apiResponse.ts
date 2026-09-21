import { Response } from "express";
import { HttpStatus, HttpStatusCode } from "../constants/httpStatus.js";
import { ApiResponsePayload, PaginationMeta } from "../types/api-response.type.js";

/**
 * Standardized API Response Formatter
 * Ensures uniform JSON structure across all API endpoints.
 */
export class ApiResponse {
  /**
   * Send a successful response (HTTP 200 OK)
   */
  static success<T = unknown>(
    res: Response,
    message: string = "Success",
    data: T | null = null,
    statusCode: HttpStatusCode = HttpStatus.OK,
    pagination?: PaginationMeta
  ): Response {
    const payload: ApiResponsePayload<T | null> = {
      success: true,
      message,
      data,
    };
    if (pagination) {
      payload.pagination = pagination;
    }
    return res.status(statusCode).json(payload);
  }

  /**
   * Send a resource created response (HTTP 201 Created)
   */
  static created<T = unknown>(
    res: Response,
    message: string = "Resource created successfully",
    data: T | null = null
  ): Response {
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send a no content response (HTTP 204 No Content)
   */
  static noContent(res: Response): Response {
    return res.status(HttpStatus.NO_CONTENT).send();
  }
}
