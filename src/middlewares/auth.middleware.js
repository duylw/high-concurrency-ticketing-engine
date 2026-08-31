import { UnauthorizedError, ForbiddenError } from "../errors/AppError.js";
import { verifyAccessToken } from "../utils/jwt.util.js";
import { prismaClient } from "../config/db.js";

/**
 * Authentication Middleware
 * Verifies the Bearer Access Token from request headers and attaches the user to req.user
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Check if Authorization header exists and has 'Bearer <token>' format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Access token is missing or malformed. Please log in.");
    }

    // 2. Extract token from header
    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new UnauthorizedError("Access token is missing. Please log in.");
    }

    // 3. Verify token and decode payload (jwt.util handles signature & expiration)
    const decoded = verifyAccessToken(token);

    // 4. Verify that user still exists in Database and is active
    const currentUser = await prismaClient.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    if (!currentUser) {
      throw new UnauthorizedError("The user belonging to this token no longer exists.");
    }

    if (!currentUser.isActive) {
      throw new ForbiddenError("Your account has been deactivated. Please contact support.");
    }

    // 5. Grant access: attach user to request object
    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};
