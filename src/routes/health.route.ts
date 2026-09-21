import { Router } from "express";
import { getDeepHealth } from "../controllers/health.controller.js";

const router = Router();

/**
 * @route   GET /api/v1/health
 * @desc    Deep system health check (PostgreSQL, Redis, BullMQ queues, Memory)
 * @access  Public
 */
router.get("/", getDeepHealth);

export default router;
