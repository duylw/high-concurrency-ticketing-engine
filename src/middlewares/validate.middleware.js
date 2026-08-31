import { z } from "zod";
import { BadRequestError } from "../errors/AppError.js";

/**
 * Higher-Order Middleware to validate incoming requests against a Zod schema
 *
 * @param {z.ZodType} schema - Zod validation schema object
 * @returns {Function} Express middleware handler
 */
export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate body, query, and params against the provided schema
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Assign sanitized/parsed data back to the request object
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query;
      if (parsed.params) req.params = parsed.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod errors into a clean, readable array for client response
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.slice(1).join("."), // Remove top-level 'body'/'query'/'params' from path
          message: err.message,
        }));

        return next(new BadRequestError("Validation failed. Please check your input.", formattedErrors));
      }

      next(error);
    }
  };
};
