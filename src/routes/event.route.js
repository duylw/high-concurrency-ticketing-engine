import { Router } from "express";
import * as eventController from "../controllers/event.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createEventSchema,
  createTicketTierSchema,
  updateEventSchema,
  eventIdParamSchema,
} from "../validations/event.validation.js";

const router = Router();

/**
 * @route   GET /api/v1/events
 * @desc    Get paginated list of events (Cache-Aside)
 * @access  Public
 */
router.get("/", eventController.getEvents);

/**
 * @route   GET /api/v1/events/:id
 * @desc    Get event details by ID (Cache-Aside)
 * @access  Public
 */
router.get("/:id", validate(eventIdParamSchema), eventController.getEventById);

/**
 * @route   POST /api/v1/events
 * @desc    Create a new event
 * @access  Private (ORGANIZER, ADMIN)
 */
router.post(
  "/",
  authenticateToken,
  authorizeRoles("ORGANIZER", "ADMIN"),
  validate(createEventSchema),
  eventController.createEvent
);

/**
 * @route   POST /api/v1/events/:id/tiers
 * @desc    Add a ticket tier to an event
 * @access  Private (ORGANIZER, ADMIN)
 */
router.post(
  "/:id/tiers",
  authenticateToken,
  authorizeRoles("ORGANIZER", "ADMIN"),
  validate(createTicketTierSchema),
  eventController.createTicketTier
);

/**
 * @route   PATCH /api/v1/events/:id
 * @desc    Update event details & invalidate cache
 * @access  Private (ORGANIZER, ADMIN)
 */
router.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("ORGANIZER", "ADMIN"),
  validate(updateEventSchema),
  eventController.updateEvent
);

export default router;
