import z from "zod";

/**
 * Validation schema for holding a Ticket
 */
export const holdTicketSchema = z.object({
    body: z.object({
        ticketTierId: z.uuid("Invalid ticket tier ID format"),
        quantity: z.coerce.number().int().positive("Quantity must be greater than 0").default(1),
    })
});