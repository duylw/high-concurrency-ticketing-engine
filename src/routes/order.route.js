import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { orderCheckoutSchema, orderIdParamSchema } from "../validations/order.validation.js";
import { idempotencyMiddleware } from "../middlewares/idempotency.middleware.js";
import * as orderController from "../controllers/order.controller.js";

const router = Router();

/**
 * @route   GET /api/v1/orders/my-orders
 * @desc    Get user's purchased tickets & orders with QR payloads
 * @access  Private (USER, ORGANIZER, ADMIN)
 */
router.get(
    "/my-orders",
    authenticateToken,
    orderController.getMyOrders
);

/**
 * @route   POST /api/v1/orders/:id/checkout
 * @desc    Idempotent checkout of held ticket order
 * @access  Private (Owner only)
 */
router.post(
    "/:id/checkout",
    authenticateToken,
    idempotencyMiddleware,
    validate(orderCheckoutSchema),
    orderController.checkoutController
);

/**
 * @route   POST /api/v1/orders/:id/check-in
 * @desc    Validate ticket QR & check-in attendee at gate
 * @access  Private (ORGANIZER, ADMIN)
 */
router.post(
    "/:id/check-in",
    authenticateToken,
    authorizeRoles("ORGANIZER", "ADMIN"),
    validate(orderIdParamSchema),
    orderController.checkInOrder
);

export default router;
