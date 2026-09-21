import { Request, Response } from "express";
import * as orderService from "../services/order.service.js";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { OrderIdParam, CheckInParam } from "../validations/order.validation.js";

export const checkoutController = catchAsync(
  async (req: Request<OrderIdParam>, res: Response) => {
    const idempotencyKey =
      (req.get("x-idempotency-key") as string) || (req.get("idempotency-key") as string);
    const order = await orderService.checkout(
      req.params.id,
      req.user!.id,
      idempotencyKey
    );
    return ApiResponse.created(res, "Order checked out successfully.", order);
  }
);

export const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const orders = await orderService.getMyOrders(req.user!.id);
  return ApiResponse.success(res, "User orders retrieved successfully.", orders);
});

export const checkInOrder = catchAsync(
  async (req: Request<CheckInParam>, res: Response) => {
    const order = await orderService.checkInOrder(
      req.user!.id,
      req.user!.role,
      req.params.id
    );
    return ApiResponse.success(res, "Ticket checked in successfully.", order);
  }
);
