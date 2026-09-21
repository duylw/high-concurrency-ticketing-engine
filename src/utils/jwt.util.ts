import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { AuthenticatedUser, TokenPair } from "../types/auth.type.js";

/**
 * Generates a short-lived Access Token (default: 15m)
 */
export const generateAccessToken = (payload: object): string => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("[JWT] JWT_ACCESS_SECRET is not configured");
  }
  const expiresIn = (process.env.JWT_ACCESS_EXPIRES_IN || "15m") as SignOptions["expiresIn"];
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Generates a long-lived Refresh Token (default: 7d)
 * Includes a random jti (JWT ID) to guarantee global uniqueness across rapid rotations
 */
export const generateRefreshToken = (payload: object): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error("[JWT] JWT_REFRESH_SECRET is not configured");
  }
  const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as SignOptions["expiresIn"];
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    secret,
    { expiresIn }
  );
};

/**
 * Generates both Access and Refresh tokens for an authenticated user
 */
export const generateAuthTokens = (user: AuthenticatedUser): TokenPair => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ id: user.id });

  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Verifies an Access Token
 */
export const verifyAccessToken = (token: string): string | JwtPayload => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("[JWT] JWT_ACCESS_SECRET is not configured");
  }
  return jwt.verify(token, secret);
};

/**
 * Verifies a Refresh Token
 */
export const verifyRefreshToken = (token: string): string | JwtPayload => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error("[JWT] JWT_REFRESH_SECRET is not configured");
  }
  return jwt.verify(token, secret);
};
