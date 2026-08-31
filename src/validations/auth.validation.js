import { z } from "zod";

/**
 * Validation schema for User Registration
 */
export const registerSchema = z.object({
  body: z.object({
    email: z.email({ message: "Please provide a valid email address" }),
    username: z
      .string()
      .trim()
      .min(3, { message: "Username must be at least 3 characters long" })
      .max(30, { message: "Username cannot exceed 30 characters" })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message: "Username can only contain letters, numbers, and underscores",
      }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters long" })
      .max(100, { message: "Password is too long" }),
    name: z
      .string()
      .trim()
      .min(1, { message: "Name cannot be empty" })
      .max(100, { message: "Name is too long" })
      .optional(),
  }),
});

/**
 * Validation schema for User Login
 */
export const loginSchema = z.object({
  body: z.object({
    email: z.email({ message: "Please provide a valid email address" }),
    password: z
      .string()
      .min(1, { message: "Password is required" }),
  }),
});

/**
 * Validation schema for Refresh Token
 */
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z
      .string()
      .min(1, { message: "Refresh token is required" }),
  }),
});