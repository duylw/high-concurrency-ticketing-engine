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

export const getMyOrders = catchAsync(async (req, res) => {
    const orders = await orderService.getMyOrders(req.user.id);
    return ApiResponse.success(res, "User orders retrieved successfully.", orders);
});

export const checkInOrder = catchAsync(async (req, res) => {
    const order = await orderService.checkInOrder(
        req.user.id,
        req.user.role,
        req.params.id
    );
    return ApiResponse.success(res, "Ticket checked in successfully.", order);
});


