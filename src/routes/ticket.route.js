import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { checkInParamSchema } from "../validations/order.validation.js";
import { holdTicketSchema } from "../validations/ticket.validation.js";
import * as ticketController from "../controllers/ticket.controller.js";
import * as orderController from "../controllers/order.controller.js";

const router = Router();

router.post(
    "/hold",
    authenticateToken,
    validate(holdTicketSchema),
    ticketController.holdTicket
);

router.post(
    "/:id/check-in",
    authenticateToken,
    authorizeRoles("ORGANIZER", "ADMIN"),
    validate(checkInParamSchema),
    orderController.checkInOrder
);

export default router;