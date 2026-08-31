import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hashes a plain text password using bcrypt algorithm
 *
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} Hashed password string
 */
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compares a plain text password with a stored bcrypt hash
 *
 * @param {string} plainPassword - User entered plain text password
 * @param {string} hashedPassword - Stored hash from database
 * @returns {Promise<boolean>} True if matching, false otherwise
 */
export const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};
