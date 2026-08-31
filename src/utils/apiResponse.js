import { HttpStatus } from "../constants/httpStatus.js";

/**
 * Standardized API Response Formatter
 * Ensures uniform JSON structure across all API endpoints.
 */
export class ApiResponse {
  /**
   * Send a successful response (HTTP 200 OK)
   *
   * @param {Object} res - Express response object
   * @param {string} message - Response message
   * @param {*} data - Payload data
   * @param {number} statusCode - HTTP Status code (default: 200)
   */
  static success(res, message = "Success", data = null, statusCode = HttpStatus.OK) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send a resource created response (HTTP 201 Created)
   *
   * @param {Object} res - Express response object
   * @param {string} message - Response message
   * @param {*} data - Created resource payload
   */
  static created(res, message = "Resource created successfully", data = null) {
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send a no content response (HTTP 204 No Content)
   *
   * @param {Object} res - Express response object
   */
  static noContent(res) {
    return res.status(HttpStatus.NO_CONTENT).send();
  }
}
