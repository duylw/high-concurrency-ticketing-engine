import { BadRequestError, ConflictError } from "../errors/AppError.js";

export interface FlashSaleEventInput {
  status: string;
  saleStartTime?: Date | null;
  saleEndTime?: Date | null;
}

/**
 * Validates whether an Event is currently open for ticket holds and purchases
 */
export const validateFlashSaleWindow = (
  event: FlashSaleEventInput,
  now: Date = new Date()
): void => {
  if (event.status === "CLOSED" || event.status === "CANCELLED" || event.status === "DRAFT") {
    throw new ConflictError(
      `Event is ${event.status.toLowerCase()}. Ticket sales are closed.`
    );
  }

  if (event.saleStartTime && now < event.saleStartTime) {
    throw new BadRequestError(
      `Flash-sale has not started yet. Opens at: ${event.saleStartTime.toISOString()}`
    );
  }

  if (event.saleEndTime && now > event.saleEndTime) {
    throw new BadRequestError(
      `Flash-sale window has closed at: ${event.saleEndTime.toISOString()}`
    );
  }
};

/**
 * Generates an individualized ticket code adhering to the standard:
 * TKT-YYYYMM-XXXX-Index (e.g. TKT-202609-B91F604C-01)
 */
export const generateTicketCode = (
  orderId: string,
  ticketIndex: number,
  timestamp: Date = new Date()
): string => {
  const datePrefix = timestamp.toISOString().slice(0, 7).replace("-", "");
  const shortOrderId = orderId.slice(0, 8).toUpperCase();
  return `TKT-${datePrefix}-${shortOrderId}-${String(ticketIndex).padStart(2, "0")}`;
};

export interface CheckInTicketInput {
  status: string;
  checkedInAt?: Date | null;
}

/**
 * Validates ticket status and Anti-Passback rules during gate check-in
 */
export const validateGateAdmission = (
  ticket: CheckInTicketInput,
  parentOrderStatus: string
): void => {
  // 1. Anti-Passback defense: Check if this specific ticket was already scanned
  if (ticket.status === "CHECKED_IN") {
    const timeStr = ticket.checkedInAt
      ? new Date(ticket.checkedInAt).toLocaleTimeString("vi-VN")
      : "earlier";
    throw new ConflictError(`Ticket has ALREADY been used for check-in at ${timeStr}!`);
  }

  // 2. Revocation check
  if (ticket.status === "REVOKED") {
    throw new BadRequestError("Ticket has been REVOKED and cannot be used.");
  }

  // 3. Parent order status validity: Must be a paid order (COMPLETED or PARTIALLY_CHECKED_IN)
  if (parentOrderStatus !== "COMPLETED" && parentOrderStatus !== "PARTIALLY_CHECKED_IN") {
    throw new BadRequestError(
      `Cannot check-in ticket with order status '${parentOrderStatus}'. Only COMPLETED orders can be checked in.`
    );
  }
};

/**
 * Computes new Order status based on the count of remaining unchecked tickets
 */
export const computeAggregatedOrderStatus = (
  remainingUncheckedCount: number
): "CHECKED_IN" | "PARTIALLY_CHECKED_IN" => {
  return remainingUncheckedCount === 0 ? "CHECKED_IN" : "PARTIALLY_CHECKED_IN";
};
