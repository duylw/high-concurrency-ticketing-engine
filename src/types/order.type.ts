export type OrderStatus =
  | "PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "PARTIALLY_CHECKED_IN"
  | "CHECKED_IN";

export type TicketItemStatus =
  | "ISSUED"
  | "CHECKED_IN"
  | "CANCELLED"
  | "REVOKED";

export interface HoldTicketDto {
  ticketTierId: string;
  quantity: number;
}

export interface CheckoutDto {
  paymentMethod?: string;
}

export interface ReleaseHoldJobData {
  orderId: string;
}
