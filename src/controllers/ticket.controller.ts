import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiResponse } from "../utils/apiResponse.js";
import * as ticketService from "../services/ticket.service.js";
import { HoldTicketInput } from "../validations/ticket.validation.js";

export const holdTicket = catchAsync(
  async (req: Request<Record<string, string>, unknown, HoldTicketInput>, res: Response) => {
    const customHoldDuration =
      process.env.NODE_ENV !== "production" && req.headers["x-test-hold-duration-ms"]
        ? parseInt(req.headers["x-test-hold-duration-ms"] as string, 10)
        : null;

    const ticket = await ticketService.holdTicket(
      req.user!.id,
      req.body.ticketTierId,
      req.body.quantity,
      customHoldDuration
    );
    return ApiResponse.created(res, "Ticket held successfully", ticket);
  }
);
