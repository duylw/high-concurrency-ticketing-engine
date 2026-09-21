import { Request, Response, NextFunction, RequestHandler } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";
import { Role } from "../types/auth.type.js";

/**
 * Role-Based Access Control (RBAC) Authorization Middleware
 * Restricts route access to users with specified roles.
 */
export const authorizeRoles = (...allowedRoles: Role[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    // 1. Ensure user is authenticated first
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required before authorization."));
    }

    // 2. Check if user's role matches any of the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Requires one of the following roles: [${allowedRoles.join(", ")}]`
        )
      );
    }

    // 3. Role verified, proceed to next handler
    next();
  };
};
