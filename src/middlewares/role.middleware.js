import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";

/**
 * Role-Based Access Control (RBAC) Authorization Middleware
 * Restricts route access to users with specified roles.
 *
 * @param {...string} allowedRoles - List of authorized roles (e.g., 'ADMIN', 'MODERATOR')
 * @returns {Function} Express middleware handler
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
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
