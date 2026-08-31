import { catchAsync } from "../utils/catchAsync.js";
import { ApiResponse } from "../utils/apiResponse.js";
import * as authService from "../services/auth.service.js";

/**
 * Controller: Register a new user
 * POST /api/v1/auth/register
 */
export const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  return ApiResponse.created(res, "User registered successfully.", result);
});

/**
 * Controller: Log in user
 * POST /api/v1/auth/login
 */
export const login = catchAsync(async (req, res) => {
  const loginPayload = {
    email: req.body.email,
    password: req.body.password,
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip || req.socket.remoteAddress,
  };

  const result = await authService.login(loginPayload);
  return ApiResponse.success(res, "Login successful.", result);
});

/**
 * Controller: Refresh Access Token
 * POST /api/v1/auth/refresh-token
 */
export const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken: token } = req.body;
  const result = await authService.refreshToken(token);
  return ApiResponse.success(res, "Access token refreshed successfully.", result);
});

/**
 * Controller: Log out user
 * POST /api/v1/auth/logout
 */
export const logout = catchAsync(async (req, res) => {
  const { refreshToken: token } = req.body;
  await authService.logout(token);
  return ApiResponse.success(res, "Logged out successfully.");
});

/**
 * Controller: Get current authenticated user profile
 * GET /api/v1/auth/me
 */
export const getMe = catchAsync(async (req, res) => {
  const result = await authService.getMe(req.user.id);
  return ApiResponse.success(res, "User profile retrieved successfully.", result);
});
