import crypto from "crypto";

/**
 * Hash a plain text token (such as a JWT Refresh Token) using SHA-256
 *
 * @param {string} token - Raw JWT string
 * @returns {string} Hex-encoded SHA-256 hash
 */
export const hashToken = (token) => {
  if (!token || typeof token !== "string") {
    throw new Error("[CRYPTO] Invalid token provided for hashing");
  }
  return crypto.createHash("sha256").update(token).digest("hex");
};
