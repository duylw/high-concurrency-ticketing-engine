import { z } from "zod";

export const orderIdParamSchema = z.object({
  params: z.object({
    id: z.uuid(),
  }),
});

export type OrderIdParam = z.infer<typeof orderIdParamSchema>["params"];

export const orderCheckoutSchema = orderIdParamSchema;

/**
 * Validation for gate check-in parameter
 * Accepts either UUID (ticketId/orderId) or Ticket Code string (e.g. TKT-202609-XXXX-01)
 */
export const checkInParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, "Ticket or Order identifier is required"),
  }),
});

export type CheckInParam = z.infer<typeof checkInParamSchema>["params"];
