import { Router } from "express";
import authRoutes from "./auth.route.js";
import userRoutes from "./user.route.js";
import eventRoutes from "./event.route.js";
import ticketRouters from "./ticket.route.js";
import orderRouters from "./order.route.js";
import { ApiResponse } from "../utils/apiResponse.js";

const rootRouter = Router();

/**
 * Health check endpoint
 * GET /api/v1/health
 */
rootRouter.get("/health", (req, res) => {
  return ApiResponse.success(res, "Service is healthy.", {
    uptime: `${process.uptime().toFixed(2)}s`,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

/**
 * Route modules
 */
rootRouter.use("/auth", authRoutes);
rootRouter.use("/users", userRoutes);
rootRouter.use("/events", eventRoutes);
rootRouter.use("/tickets", ticketRouters);
rootRouter.use("/orders", orderRouters);

export default rootRouter;
