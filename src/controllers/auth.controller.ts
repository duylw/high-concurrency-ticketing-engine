import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiResponse } from "../utils/apiResponse.js";
import * as authService from "../services/auth.service.js";
import {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
} from "../validations/auth.validation.js";

/**
 * Controller: Register a new user
 * POST /api/v1/auth/register
 */
export const register = catchAsync(
  async (req: Request<Record<string, string>, unknown, RegisterInput>, res: Response) => {
    const result = await authService.register(req.body);
    return ApiResponse.created(res, "User registered successfully.", result);
  }
);

/**
 * Controller: Log in user
 * POST /api/v1/auth/login
 */
export const login = catchAsync(
  async (req: Request<Record<string, string>, unknown, LoginInput>, res: Response) => {
    const loginPayload = {
      email: req.body.email,
      password: req.body.password,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip || req.socket.remoteAddress,
    };

    const result = await authService.login(loginPayload);
    return ApiResponse.success(res, "Login successful.", result);
  }
);

/**
 * Controller: Refresh Access Token with Token Rotation
 * POST /api/v1/auth/refresh-token
 */
export const refreshToken = catchAsync(
  async (req: Request<Record<string, string>, unknown, RefreshTokenInput>, res: Response) => {
    const { refreshToken: token } = req.body;
    const meta = {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip || req.socket.remoteAddress,
    };

    const result = await authService.refreshToken(token, meta);
    return ApiResponse.success(res, "Token pair refreshed successfully.", result);
  }
);

/**
 * Controller: Log out user from current session
 * POST /api/v1/auth/logout
 */
export const logout = catchAsync(
  async (req: Request<Record<string, string>, unknown, RefreshTokenInput>, res: Response) => {
    const { refreshToken: token } = req.body;
    await authService.logout(token);
    return ApiResponse.success(res, "Logged out successfully.");
  }
);

/**
 * Controller: Log out user from all active sessions
 * POST /api/v1/auth/logout-all
 */
export const logoutAll = catchAsync(async (req: Request, res: Response) => {
  await authService.logoutAll(req.user!.id);
  return ApiResponse.success(res, "Logged out from all devices successfully.");
});

/**
 * Controller: Get all active sessions for current user
 * GET /api/v1/auth/sessions
 */
export const getSessions = catchAsync(async (req: Request, res: Response) => {
  const sessions = await authService.getActiveSessions(req.user!.id);
  return ApiResponse.success(res, "Active sessions retrieved successfully.", {
    total: sessions.length,
    sessions,
  });
});

/**
 * Controller: Revoke a specific active session
 * DELETE /api/v1/auth/sessions/:id
 */
export const revokeSession = catchAsync(async (req: Request, res: Response) => {
  await authService.revokeSession(req.user!.id, req.params.id as string);
  return ApiResponse.success(res, "Session revoked successfully.");
});

/**
 * Controller: Get current authenticated user profile
 * GET /api/v1/auth/me
 */
export const getMe = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.getMe(req.user!.id);
  return ApiResponse.success(res, "User profile retrieved successfully.", result);
});
