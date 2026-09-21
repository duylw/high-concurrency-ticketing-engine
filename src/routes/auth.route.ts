import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { authRateLimiter } from "../middlewares/rateLimit.middleware.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "../validations/auth.validation.js";

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user (protected with Redis rate limit)
 * @access  Public
 */
router.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  authController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user & get tokens (protected with Redis rate limit)
 * @access  Public
 */
router.post(
  "/login",
  authRateLimiter,
  validate(loginSchema),
  authController.login
);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Rotate and issue new Access Token + Refresh Token pair
 * @access  Public
 */
router.post(
  "/refresh-token",
  validate(refreshTokenSchema),
  authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Revoke current refresh token session
 * @access  Public
 */
router.post("/logout", authController.logout);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Revoke all active sessions for current user
 * @access  Private
 */
router.post("/logout-all", authenticateToken, authController.logoutAll);

/**
 * @route   GET /api/v1/auth/sessions
 * @desc    List all active devices/sessions for current user
 * @access  Private
 */
router.get("/sessions", authenticateToken, authController.getSessions);

/**
 * @route   DELETE /api/v1/auth/sessions/:id
 * @desc    Revoke a specific active session by ID
 * @access  Private
 */
router.delete("/sessions/:id", authenticateToken, authController.revokeSession);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private (Requires valid Access Token)
 */
router.get("/me", authenticateToken, authController.getMe);

export default router;
