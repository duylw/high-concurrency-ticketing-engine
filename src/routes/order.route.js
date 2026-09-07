import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { orderCheckoutSchema } from "../validations/order.validation.js";
import { idempotencyMiddleware } from "../middlewares/idempotency.middleware.js";
import * as checkoutController from "../controllers/order.controller.js"

const router = Router();

router.post(
    "/:id/checkout",
    authenticateToken,
    idempotencyMiddleware,
    validate(orderCheckoutSchema),
    checkoutController.checkoutController
);

export default router;
