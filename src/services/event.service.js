import { prismaClient } from "../config/db.js";
import { CacheUtil } from "../utils/cache.util.js";
import { CacheKeys } from "../constants/cacheKeys.js";
import { NotFoundError, ForbiddenError } from "../errors/AppError.js";

const EVENT_CACHE_TTL = 3600; // 1 hour for event details
const EVENT_LIST_CACHE_TTL = 300; // 5 minutes for event list

/**
 * Create a new Event
 *
 * @param {string} organizerId - ID of organizer
 * @param {Object} eventData - { title, description, bannerUrl, startTime, endTime }
 * @returns {Promise<Object>} Created Event
 */
export const createEvent = async (organizerId, eventData) => {
  const newEvent = await prismaClient.event.create({
    data: {
      ...eventData,
      startTime: new Date(eventData.startTime),
      endTime: new Date(eventData.endTime),
      ...(eventData.saleStartTime && { saleStartTime: new Date(eventData.saleStartTime) }),
      ...(eventData.saleEndTime && { saleEndTime: new Date(eventData.saleEndTime) }),
      ...(eventData.status && { status: eventData.status }),
      organizerId,
    },
    include: {
      ticketTiers: true,
    },
  });

  // Invalidate event lists in cache
  await CacheUtil.delPattern(CacheKeys.ALL_EVENTS_PATTERN);

  return newEvent;
};

/**
 * Create a Ticket Tier for an Event
 *
 * @param {string} userId - ID of authenticated user
 * @param {string} userRole - Role of user
 * @param {string} eventId - ID of event
 * @param {Object} tierData - { name, price, totalStock }
 * @returns {Promise<Object>} Created Ticket Tier
 */
export const createTicketTier = async (userId, userRole, eventId, tierData) => {
  const event = await prismaClient.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new NotFoundError("Event not found.");
  }

  // Verify ownership or Admin privilege
  if (userRole !== "ADMIN" && event.organizerId !== userId) {
    throw new ForbiddenError("You do not have permission to add ticket tiers to this event.");
  }

  const tier = await prismaClient.ticketTier.create({
    data: {
      eventId,
      name: tierData.name,
      price: tierData.price,
      totalStock: tierData.totalStock,
      availableStock: tierData.totalStock,
    },
  });

  // Invalidate event details cache so next read includes new tier
  await CacheUtil.del(CacheKeys.EVENT_DETAILS(eventId));
  await CacheUtil.delPattern(CacheKeys.ALL_EVENTS_PATTERN);

  return tier;
};

/**
 * Get paginated list of Events using Cache-Aside
 *
 * @param {Object} query - { page, limit }
 * @returns {Promise<{ total: number, page: number, limit: number, events: Array, isFromCache: boolean }>}
 */
export const getEvents = async ({ page = 1, limit = 10 }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const cacheKey = CacheKeys.EVENT_LIST(pageNum, limitNum);

  const { data, isFromCache } = await CacheUtil.getOrSet(
    cacheKey,
    EVENT_LIST_CACHE_TTL,
    async () => {
      const skip = (pageNum - 1) * limitNum;
      const [total, events] = await prismaClient.$transaction([
        prismaClient.event.count(),
        prismaClient.event.findMany({
          skip,
          take: limitNum,
          include: {
            ticketTiers: {
              select: {
                id: true,
                name: true,
                price: true,
                totalStock: true,
                availableStock: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      return { total, events };
    }
  );

  return {
    total: data.total,
    page: pageNum,
    limit: limitNum,
    events: data.events,
    isFromCache,
  };
};

/**
 * Get single Event by ID using Cache-Aside with Anti-Stampede & Anti-Penetration
 *
 * @param {string} eventId
 * @returns {Promise<{ event: Object, isFromCache: boolean }>}
 */
export const getEventById = async (eventId) => {
  const cacheKey = CacheKeys.EVENT_DETAILS(eventId);

  const { data, isFromCache } = await CacheUtil.getOrSet(
    cacheKey,
    EVENT_CACHE_TTL,
    async () => {
      const event = await prismaClient.event.findUnique({
        where: { id: eventId },
        include: {
          ticketTiers: true,
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
            },
          },
        },
      });

      return event;
    }
  );

  if (!data) {
    throw new NotFoundError("Event not found.");
  }

  return {
    event: data,
    isFromCache,
  };
};

/**
 * Update Event details & Invalidate Cache
 *
 * @param {string} userId - User ID
 * @param {string} userRole - User Role
 * @param {string} eventId - Event ID
 * @param {Object} updateData - Partial event data
 * @returns {Promise<Object>} Updated Event
 */
export const updateEvent = async (userId, userRole, eventId, updateData) => {
  const existingEvent = await prismaClient.event.findUnique({
    where: { id: eventId },
  });

  if (!existingEvent) {
    throw new NotFoundError("Event not found.");
  }

  if (userRole !== "ADMIN" && existingEvent.organizerId !== userId) {
    throw new ForbiddenError("You do not have permission to update this event.");
  }

  const updatedEvent = await prismaClient.event.update({
    where: { id: eventId },
    data: {
      ...updateData,
      ...(updateData.startTime && { startTime: new Date(updateData.startTime) }),
      ...(updateData.endTime && { endTime: new Date(updateData.endTime) }),
      ...(updateData.saleStartTime && { saleStartTime: new Date(updateData.saleStartTime) }),
      ...(updateData.saleEndTime && { saleEndTime: new Date(updateData.saleEndTime) }),
      ...(updateData.status && { status: updateData.status }),
    },
    include: {
      ticketTiers: true,
    },
  });

  // Explicit Cache Invalidation
  await CacheUtil.del(CacheKeys.EVENT_DETAILS(eventId));
  await CacheUtil.delPattern(CacheKeys.ALL_EVENTS_PATTERN);

  return updatedEvent;
};

/**
 * Get all events organized by current organizer with aggregate sales metrics
 *
 * @param {string} organizerId - ID of organizer
 * @returns {Promise<Array>} List of events with analytics
 */
export const getOrganizerEvents = async (organizerId) => {
  const events = await prismaClient.event.findMany({
    where: { organizerId },
    include: {
      ticketTiers: {
        include: {
          orders: {
            where: {
              status: { in: ["COMPLETED", "CHECKED_IN"] },
            },
            select: {
              quantity: true,
              totalAmount: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return events.map((event) => {
    let totalStock = 0;
    let availableStock = 0;
    let totalTicketsSold = 0;
    let totalRevenue = 0;

    event.ticketTiers.forEach((tier) => {
      totalStock += tier.totalStock;
      availableStock += tier.availableStock;
      tier.orders.forEach((order) => {
        totalTicketsSold += order.quantity;
        totalRevenue += Number(order.totalAmount);
      });
    });

    const soldOutPercentage = totalStock > 0 ? Math.round((totalTicketsSold / totalStock) * 100) : 0;

    return {
      ...event,
      stats: {
        totalStock,
        availableStock,
        totalTicketsSold,
        totalRevenue,
        soldOutPercentage,
      },
    };
  });
};

/**
 * Delete or cancel an event
 *
 * @param {string} userId - User ID
 * @param {string} userRole - User Role
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Status message
 */
export const deleteEvent = async (userId, userRole, eventId) => {
  const event = await prismaClient.event.findUnique({
    where: { id: eventId },
    include: {
      ticketTiers: {
        include: {
          orders: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!event) {
    throw new NotFoundError("Event not found.");
  }

  if (userRole !== "ADMIN" && event.organizerId !== userId) {
    throw new ForbiddenError("You do not have permission to delete this event.");
  }

  // Count total orders across all tiers
  const totalOrders = event.ticketTiers.reduce((acc, tier) => acc + tier.orders.length, 0);

  if (totalOrders > 0) {
    // Cannot hard-delete because orders exist: Soft-cancel the event
    await prismaClient.event.update({
      where: { id: eventId },
      data: { status: "CANCELLED" },
    });

    await CacheUtil.del(CacheKeys.EVENT_DETAILS(eventId));
    await CacheUtil.delPattern(CacheKeys.ALL_EVENTS_PATTERN);

    return {
      message: "Event has existing orders. Status changed to CANCELLED instead of hard-deletion.",
      status: "CANCELLED",
      eventId,
    };
  }

  // No orders exist: Safe to hard delete
  await prismaClient.ticketTier.deleteMany({ where: { eventId } });
  await prismaClient.event.delete({ where: { id: eventId } });

  await CacheUtil.del(CacheKeys.EVENT_DETAILS(eventId));
  await CacheUtil.delPattern(CacheKeys.ALL_EVENTS_PATTERN);

  return {
    message: "Event deleted successfully.",
    eventId,
  };
};
