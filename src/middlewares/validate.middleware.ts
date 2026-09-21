import { Request, Response, NextFunction, RequestHandler } from "express";
import { z } from "zod";
import { BadRequestError } from "../errors/AppError.js";

/**
 * Higher-Order Middleware to validate incoming requests against a Zod schema
 */
export const validate = (schema: z.ZodType): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate body, query, and params against the provided schema
      const parsed = (await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })) as { body?: unknown; query?: unknown; params?: unknown };

      // Assign sanitized/parsed data back to the request object
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query as never;
      if (parsed.params) req.params = parsed.params as never;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues || (error as unknown as { errors: z.ZodIssue[] }).errors || [];
        const formattedErrors = issues.map((err) => ({
          field: err.path.slice(1).join("."),
          message: err.message,
        }));

        return next(
          new BadRequestError("Validation failed. Please check your input.", formattedErrors)
        );
      }

      next(error);
    }
  };
};
