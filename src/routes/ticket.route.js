import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { holdTicketSchema } from "../validations/ticket.validation.js";
import * as ticketController from "../controllers/ticket.controller.js";

const router = Router();

router.post(
    "/hold",
    authenticateToken,
    validate(holdTicketSchema),
    ticketController.holdTicket
);

export default router;