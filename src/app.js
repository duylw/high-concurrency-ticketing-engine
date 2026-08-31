import express from "express";
import cors from "cors";
import rootRouter from "./routes/index.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { NotFoundError } from "./errors/AppError.js";

const app = express();

/**
 * 1. Global Pre-Middlewares
 */
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * 2. API Routes
 */
app.use("/api/v1", rootRouter);

/**
 * 3. Handle Undefined Routes (404)
 */
app.use((req, res, next) => {
  next(new NotFoundError(`Cannot find ${req.method} ${req.originalUrl} on this server.`));
});

/**
 * 4. Global Error Handling Middleware (Must be registered last)
 */
app.use(errorHandler);

export default app;
