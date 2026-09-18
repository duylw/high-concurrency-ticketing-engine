import { AuthenticatedUser } from "./auth.type.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      idempotencyKey?: string;
    }
  }
}

export {};
