import { prismaClient } from "../config/db.js";
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "../errors/AppError.js";
import { hashPassword, comparePassword } from "../utils/password.util.js";
import {
  generateAuthTokens,
  generateAccessToken,
  verifyRefreshToken,
} from "../utils/jwt.util.js";

/**
 * Helper function to sanitize user object (remove sensitive fields like password)
 */
const sanitizeUser = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

/**
 * Calculate Refresh Token expiration date (7 days from now)
 */
const getRefreshTokenExpiry = () => {
  const expiryDays = parseInt(process.env.JWT_REFRESH_EXPIRES_IN || "7", 10) || 7;
  return new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
};

/**
 * Register a new User
 *
 * @param {Object} userData - User registration data (email, username, password, name)
 * @returns {Promise<{ user: Object, tokens: Object }>}
 */
export const register = async ({ email, username, password, name }) => {
  // 1. Check if email already exists
  const existingEmail = await prismaClient.user.findUnique({
    where: { email },
  });
  if (existingEmail) {
    throw new ConflictError("An account with this email already exists.");
  }

  // 2. Check if username already exists
  const existingUsername = await prismaClient.user.findUnique({
    where: { username },
  });
  if (existingUsername) {
    throw new ConflictError("An account with this username already exists.");
  }

  // 3. Hash the plain text password
  const hashedPassword = await hashPassword(password);

  // 4. Create new user in PostgreSQL
  const newUser = await prismaClient.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      name,
      role: "USER", // Default role
      isActive: true,
    },
  });

  // 5. Generate Access & Refresh Tokens
  const tokens = generateAuthTokens(newUser);

  // 6. Save Refresh Token to Database for session management
  await prismaClient.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: newUser.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return {
    user: sanitizeUser(newUser),
    tokens,
  };
};

/**
 * Log in an existing User
 *
 * @param {Object} loginData - { email, password, userAgent, ipAddress }
 * @returns {Promise<{ user: Object, tokens: Object }>}
 */
export const login = async ({ email, password, userAgent, ipAddress }) => {
  // 1. Find user by email
  const user = await prismaClient.user.findUnique({
    where: { email },
  });
  if (!user) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  // 2. Check if account is active
  if (!user.isActive) {
    throw new ForbiddenError("Your account has been deactivated. Please contact support.");
  }

  // 3. Compare password with stored bcrypt hash
  const isPasswordMatch = await comparePassword(password, user.password);
  if (!isPasswordMatch) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  // 4. Generate Access & Refresh Tokens
  const tokens = generateAuthTokens(user);

  // 5. Save Refresh Token session in Database
  await prismaClient.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
      userAgent,
      ipAddress,
    },
  });

  return {
    user: sanitizeUser(user),
    tokens,
  };
};

/**
 * Issue a new Access Token using a valid Refresh Token
 *
 * @param {string} incomingRefreshToken - Refresh Token from client
 * @returns {Promise<{ accessToken: string }>}
 */
export const refreshToken = async (incomingRefreshToken) => {
  // 1. Verify token signature and expiration with JWT util
  const decoded = verifyRefreshToken(incomingRefreshToken);

  // 2. Verify token exists in Database and is not expired or revoked
  const tokenDoc = await prismaClient.refreshToken.findUnique({
    where: { token: incomingRefreshToken },
  });

  if (!tokenDoc || tokenDoc.isRevoked || tokenDoc.expiresAt < new Date()) {
    throw new UnauthorizedError("Invalid or expired refresh token. Please log in again.");
  }

  // 3. Find user and check status
  const user = await prismaClient.user.findUnique({
    where: { id: decoded.id },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError("User no longer exists or is deactivated.");
  }

  // 4. Generate new short-lived Access Token
  const newAccessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    accessToken: newAccessToken,
  };
};

/**
 * Log out user by deleting/invalidating the Refresh Token session
 *
 * @param {string} token - Refresh Token to remove
 * @returns {Promise<void>}
 */
export const logout = async (token) => {
  if (!token) return;

  // Delete the session from database
  await prismaClient.refreshToken.deleteMany({
    where: { token },
  });
};

/**
 * Get current authenticated user profile
 *
 * @param {string} userId - User ID from authenticated token
 * @returns {Promise<Object>} Safe user profile
 */
export const getMe = async (userId) => {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  return sanitizeUser(user);
};
