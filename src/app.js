import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import rootRouter from "./routes/index.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { NotFoundError } from "./errors/AppError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/**
 * 1. Global Pre-Middlewares
 */
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * 2. Static Assets Serving (SPA Shell & Public Assets)
 */
app.use(express.static(path.join(__dirname, "../public"), {
  setHeaders: (res) => {
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  }
}));

/**
 * 3. API Routes
 */
app.use("/api/v1", rootRouter);

/**
 * 4. SPA Client-Side Routing Fallback (Non-API Routes)
 */
app.get("{*path}", (req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return next(new NotFoundError(`Cannot find ${req.method} ${req.originalUrl} on this server.`));
  }
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

/**
 * 5. Handle Undefined Routes (404)
 */
app.use((req, res, next) => {
  next(new NotFoundError(`Cannot find ${req.method} ${req.originalUrl} on this server.`));
});

/**
 * 6. Global Error Handling Middleware (Must be registered last)
 */
app.use(errorHandler);

export default app;

