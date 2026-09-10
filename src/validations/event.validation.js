import { z } from "zod";

/**
 * Validation schema for creating a new Event
 */
export const createEventSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
    description: z.string().trim().min(10, "Description must be at least 10 characters"),
    bannerUrl: z.url("Banner URL must be a valid URL").optional(),
    startTime: z.iso.datetime("Start time must be a valid ISO datetime string"),
    endTime: z.iso.datetime("End time must be a valid ISO datetime string"),
    saleStartTime: z.iso.datetime().optional().nullable(),
    saleEndTime: z.iso.datetime().optional().nullable(),
    status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "CANCELLED"]).optional(),
  }),
});

/**
 * Validation schema for creating a Ticket Tier
 */
export const createTicketTierSchema = z.object({
  params: z.object({
    id: z.uuid("Invalid event ID format"),
  }),
  body: z.object({
    name: z.string().trim().min(2, "Tier name must be at least 2 characters").max(50),
    price: z.number().positive("Price must be greater than 0"),
    totalStock: z.number().int().positive("Total stock must be at least 1"),
  }),
});

/**
 * Validation schema for updating an Event
 */
export const updateEventSchema = z.object({
  params: z.object({
    id: z.uuid("Invalid event ID format"),
  }),
  body: z.object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().min(10).optional(),
    bannerUrl: z.url().optional(),
    startTime: z.iso.datetime().optional(),
    endTime: z.iso.datetime().optional(),
    saleStartTime: z.iso.datetime().optional().nullable(),
    saleEndTime: z.iso.datetime().optional().nullable(),
    status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "CANCELLED"]).optional(),
  }),
});

/**
 * Validation schema for Event ID parameter
 */
export const eventIdParamSchema = z.object({
  params: z.object({
    id: z.uuid("Invalid event ID format"),
  }),
});
