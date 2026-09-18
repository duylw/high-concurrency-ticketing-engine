import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hashes a plain text password using bcrypt algorithm
 *
 * @param password - Plain text password to hash
 * @returns Hashed password string
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compares a plain text password with a stored bcrypt hash
 *
 * @param plainPassword - User entered plain text password
 * @param hashedPassword - Stored hash from database
 * @returns True if matching, false otherwise
 */
export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};
