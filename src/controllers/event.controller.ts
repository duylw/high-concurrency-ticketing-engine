import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiResponse } from "../utils/apiResponse.js";
import * as eventService from "../services/event.service.js";
import {
  CreateEventInput,
  CreateTicketTierInput,
  UpdateEventInput,
  EventIdParam,
} from "../validations/event.validation.js";

/**
 * Create a new Event
 * POST /api/v1/events
 */
export const createEvent = catchAsync(
  async (req: Request<Record<string, string>, unknown, CreateEventInput>, res: Response) => {
    const event = await eventService.createEvent(req.user!.id, req.body);
    return ApiResponse.created(res, "Event created successfully.", event);
  }
);

/**
 * Create a Ticket Tier for an Event
 * POST /api/v1/events/:id/tiers
 */
export const createTicketTier = catchAsync(
  async (req: Request<EventIdParam, unknown, CreateTicketTierInput>, res: Response) => {
    const tier = await eventService.createTicketTier(
      req.user!.id,
      req.user!.role,
      req.params.id,
      req.body
    );
    return ApiResponse.created(res, "Ticket tier created successfully.", tier);
  }
);

/**
 * Get paginated list of Events (Cache-Aside)
 * GET /api/v1/events
 */
export const getEvents = catchAsync(async (req: Request, res: Response) => {
  const result = await eventService.getEvents(req.query);

  res.setHeader("X-Cache-Status", result.isFromCache ? "HIT" : "MISS");
  return ApiResponse.success(res, "Events retrieved successfully.", result);
});

/**
 * Get Event details by ID (Cache-Aside)
 * GET /api/v1/events/:id
 */
export const getEventById = catchAsync(
  async (req: Request<EventIdParam>, res: Response) => {
    const result = await eventService.getEventById(req.params.id);

    res.setHeader("X-Cache-Status", result.isFromCache ? "HIT" : "MISS");
    return ApiResponse.success(res, "Event details retrieved successfully.", {
      ...result.event,
      _cache: { isFromCache: result.isFromCache },
    });
  }
);

/**
 * Update Event details & Invalidate Cache
 * PATCH /api/v1/events/:id
 */
export const updateEvent = catchAsync(
  async (req: Request<EventIdParam, unknown, UpdateEventInput>, res: Response) => {
    const event = await eventService.updateEvent(
      req.user!.id,
      req.user!.role,
      req.params.id,
      req.body
    );
    return ApiResponse.success(res, "Event updated successfully.", event);
  }
);

/**
 * Get all events created by current organizer with sales analytics
 * GET /api/v1/events/organizer/my-events
 */
export const getOrganizerEvents = catchAsync(async (req: Request, res: Response) => {
  const events = await eventService.getOrganizerEvents(req.user!.id);
  return ApiResponse.success(res, "Organizer events retrieved successfully.", events);
});

/**
 * Delete or cancel an Event
 * DELETE /api/v1/events/:id
 */
export const deleteEvent = catchAsync(
  async (req: Request<EventIdParam>, res: Response) => {
    const result = await eventService.deleteEvent(
      req.user!.id,
      req.user!.role,
      req.params.id
    );
    return ApiResponse.success(res, result.message, result);
  }
);
