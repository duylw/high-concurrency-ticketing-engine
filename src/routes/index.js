import { Router } from "express";
import authRoutes from "./auth.route.js";
import userRoutes from "./user.route.js";
import eventRoutes from "./event.route.js";
import ticketRouters from "./ticket.route.js";
import orderRouters from "./order.route.js";
import healthRoutes from "./health.route.js";

const rootRouter = Router();

/**
 * System Health Check Endpoint
 * GET /api/v1/health
 */
rootRouter.use("/health", healthRoutes);

/**
 * Route modules
 */
rootRouter.use("/auth", authRoutes);
rootRouter.use("/users", userRoutes);
rootRouter.use("/events", eventRoutes);
rootRouter.use("/tickets", ticketRouters);
rootRouter.use("/orders", orderRouters);

export default rootRouter;