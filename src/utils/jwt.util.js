import jwt from "jsonwebtoken";
import crypto from "crypto";

/**
 * Generates a short-lived Access Token (default: 15m)
 *
 * @param {Object} payload - User information (id, email, role)
 * @returns {string} Signed JWT Access Token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });
};

/**
 * Generates a long-lived Refresh Token (default: 7d)
 * Includes a random jti (JWT ID) to guarantee global uniqueness across rapid rotations
 *
 * @param {Object} payload - Token identifier (userId)
 * @returns {string} Signed JWT Refresh Token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    }
  );
};

/**
 * Generates both Access and Refresh tokens for an authenticated user
 *
 * @param {Object} user - User record from database
 * @returns {{ accessToken: string, refreshToken: string }} Token pair
 */
export const generateAuthTokens = (user) => {
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
 *
 * @param {string} token - Bearer JWT Token
 * @returns {Object} Decoded payload
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

/**
 * Verifies a Refresh Token
 *
 * @param {string} token - Refresh Token string
 * @returns {Object} Decoded payload
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};
