import { z } from "zod";

export const getMaxTicketsPerOrder = (): number => {
  return parseInt(process.env.MAX_TICKETS_PER_ORDER || "4", 10);
};

/**
 * Validation schema for holding a Ticket
 */
export const holdTicketSchema = z.object({
  body: z.object({
    ticketTierId: z.uuid("Invalid ticket tier ID format"),
    quantity: z.coerce
      .number()
      .int()
      .positive("Quantity must be greater than 0")
      .superRefine((val, ctx) => {
        const maxLimit = getMaxTicketsPerOrder();
        if (val > maxLimit) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Maximum tickets allowed per order is ${maxLimit}. Received ${val}.`,
          });
        }
      })
      .default(1),
  }),
});

export type HoldTicketInput = z.infer<typeof holdTicketSchema>["body"];
