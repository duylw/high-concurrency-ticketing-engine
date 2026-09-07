import * as orderService from "../services/order.service.js";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiResponse } from "../utils/apiResponse.js";

export const checkoutController = catchAsync(async (req, res) => {
    const idempotencyKey = req.get("x-idempotency-key") || req.get("idempotency-key");
    const order = await orderService.checkout(
        req.params.id,
        req.user.id,
        idempotencyKey
    )
    return ApiResponse.created(res, "Order checked out successfully.", order)
})

