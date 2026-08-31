import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { prismaClient } from "../config/db.js";
import { NotFoundError } from "../errors/AppError.js";

const router = Router();

/**
 * @route   GET /api/v1/users
 * @desc    Get all users list (Demo RBAC)
 * @access  Private (ADMIN, MODERATOR only)
 */
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "MODERATOR"),
  catchAsync(async (req, res) => {
    const users = await prismaClient.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createAt: true,
        updatedAt: true,
      },
      orderBy: { createAt: "desc" },
    });

    return ApiResponse.success(res, "Users list retrieved successfully.", {
      total: users.length,
      users,
    });
  })
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get single user by ID
 * @access  Private (ADMIN only)
 */
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const user = await prismaClient.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found.`);
    }

    return ApiResponse.success(res, "User details retrieved successfully.", user);
  })
);

export default router;
