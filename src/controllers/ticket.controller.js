import { catchAsync } from "../utils/catchAsync.js";
import { ApiResponse } from "../utils/apiResponse.js";
import * as ticketService from "../services/ticket.service.js";


export const holdTicket = catchAsync(async (req, res) => {
    const ticket = await ticketService.holdTicket(
        req.user.id,
        req.body.ticketTierId,
        req.body.quantity,
    )
    return ApiResponse.created(res, "Ticket held successfully", ticket)
})

