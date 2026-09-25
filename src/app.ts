import path from "path";
import { fileURLToPath } from "url";
import express, { Request, Response, NextFunction } from "express";
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
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : [
      "http://localhost:5173",
      "http://localhost:4173",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:4173",
      "http://localhost:3000",
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * 2. Static Assets Serving (SPA Shell & Public Assets)
 */
app.use(
  express.static(path.join(__dirname, "../public"), {
    setHeaders: (res: Response) => {
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    },
  })
);

/**
 * 3. API Routes
 */
app.use("/api/v1", rootRouter);

/**
 * 4. SPA Client-Side Routing Fallback (Non-API Routes)
 */
app.get("{*path}", (req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl.startsWith("/api/")) {
    return next(new NotFoundError(`Cannot find ${req.method} ${req.originalUrl} on this server.`));
  }
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

/**
 * 5. Handle Undefined Routes (404)
 */
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError(`Cannot find ${req.method} ${req.originalUrl} on this server.`));
});

/**
 * 6. Global Error Handling Middleware (Must be registered last)
 */
app.use(errorHandler);

export default app;
