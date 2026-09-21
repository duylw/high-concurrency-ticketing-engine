import { User } from "@prisma/client";
import { prismaClient } from "../config/db.js";
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "../errors/AppError.js";
import { hashPassword, comparePassword } from "../utils/password.util.js";
import { hashToken } from "../utils/crypto.util.js";
import { generateAuthTokens, verifyRefreshToken } from "../utils/jwt.util.js";
import { AuthenticatedUser, TokenPair } from "../types/auth.type.js";

import { RegisterInput, LoginInput } from "../validations/auth.validation.js";

export type SafeUser = Omit<User, "password">;

export type RegisterParams = RegisterInput;

export type LoginParams = LoginInput & {
  userAgent?: string;
  ipAddress?: string;
};

export interface RefreshMeta {
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Helper function to sanitize user object (remove sensitive fields like password)
 */
const sanitizeUser = (user: User): SafeUser => {
  const { password: _p, ...safeUser } = user;
  return safeUser;
};

/**
 * Calculate Refresh Token expiration date (7 days from now)
 */
const getRefreshTokenExpiry = (): Date => {
  const expiryDays = parseInt(process.env.JWT_REFRESH_EXPIRES_IN || "7", 10) || 7;
  return new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
};

/**
 * Register a new User
 */
export const register = async ({
  email,
  username,
  password,
  name,
}: RegisterParams): Promise<{ user: SafeUser; tokens: TokenPair }> => {
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
      role: "USER",
      isActive: true,
    },
  });

  // 5. Generate Access & Refresh Tokens
  const tokens = generateAuthTokens(newUser as AuthenticatedUser);

  // 6. Save SHA-256 Hashed Refresh Token to Database for session management
  await prismaClient.refreshToken.create({
    data: {
      token: hashToken(tokens.refreshToken),
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
 */
export const login = async ({
  email,
  password,
  userAgent,
  ipAddress,
}: LoginParams): Promise<{ user: SafeUser; tokens: TokenPair }> => {
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
  const tokens = generateAuthTokens(user as AuthenticatedUser);

  // 5. Save SHA-256 Hashed Refresh Token session in Database
  await prismaClient.refreshToken.create({
    data: {
      token: hashToken(tokens.refreshToken),
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
 * Issue a new token pair using Refresh Token Rotation (RTR)
 * Implements token reuse detection to defend against replay attacks
 */
export const refreshToken = async (
  incomingRefreshToken: string,
  { userAgent, ipAddress }: RefreshMeta = {}
): Promise<{ accessToken: string; refreshToken: string; tokens: TokenPair }> => {
  // 1. Verify token signature and expiration with JWT util
  const decoded = verifyRefreshToken(incomingRefreshToken) as { id: string };

  // 2. Hash incoming token for lookup
  const incomingHash = hashToken(incomingRefreshToken);

  // 3. Query Database for this token
  const tokenDoc = await prismaClient.refreshToken.findUnique({
    where: { token: incomingHash },
  });

  // 4. REUSE DETECTION: If token exists but was already revoked, terminate all user sessions
  if (tokenDoc && tokenDoc.isRevoked) {
    await prismaClient.refreshToken.deleteMany({
      where: { userId: tokenDoc.userId },
    });
    throw new ForbiddenError(
      "Compromised session detected: This refresh token was already revoked. All active sessions have been terminated for security."
    );
  }

  // 5. Check existence and validity
  if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
    throw new UnauthorizedError("Invalid or expired refresh token. Please log in again.");
  }

  // 6. Find user and check status
  const user = await prismaClient.user.findUnique({
    where: { id: decoded.id },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError("User no longer exists or is deactivated.");
  }

  // 7. Generate brand new token pair (Access + Refresh)
  const newTokens = generateAuthTokens(user as AuthenticatedUser);
  const newHashedToken = hashToken(newTokens.refreshToken);

  // 8. Atomic Token Rotation: Invalidate old token and record new token
  await prismaClient.$transaction([
    prismaClient.refreshToken.update({
      where: { id: tokenDoc.id },
      data: { isRevoked: true },
    }),
    prismaClient.refreshToken.create({
      data: {
        token: newHashedToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiry(),
        userAgent: userAgent || tokenDoc.userAgent,
        ipAddress: ipAddress || tokenDoc.ipAddress,
      },
    }),
  ]);

  return {
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
    tokens: newTokens,
  };
};

/**
 * Log out user by deleting/invalidating the Refresh Token session
 */
export const logout = async (token?: string): Promise<void> => {
  if (!token) return;

  const hashed = hashToken(token);
  await prismaClient.refreshToken.deleteMany({
    where: { token: hashed },
  });
};

/**
 * Log out user from all active sessions/devices
 */
export const logoutAll = async (userId: string): Promise<void> => {
  await prismaClient.refreshToken.deleteMany({
    where: { userId },
  });
};

/**
 * Get all active sessions for a user
 */
export const getActiveSessions = async (userId: string) => {
  const sessions = await prismaClient.refreshToken.findMany({
    where: {
      userId,
      isRevoked: false,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      userAgent: true,
      ipAddress: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return sessions;
};

/**
 * Revoke a specific session
 */
export const revokeSession = async (userId: string, sessionId: string): Promise<void> => {
  const session = await prismaClient.refreshToken.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    throw new NotFoundError("Session not found or already terminated.");
  }

  await prismaClient.refreshToken.delete({
    where: { id: sessionId },
  });
};

/**
 * Get current authenticated user profile
 */
export const getMe = async (userId: string): Promise<SafeUser> => {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  return sanitizeUser(user);
};
