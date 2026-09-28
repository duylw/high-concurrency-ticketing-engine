import { prismaClient } from "../config/db.js";
import { CacheKeys } from "../constants/cacheKeys.js";
import { CacheUtil } from "../utils/cache.util.js";
import { ConflictError, NotFoundError } from "../errors/AppError.js";
import { ticketReleaseQueue } from "../config/queue.js";
import { validateFlashSaleWindow } from "../utils/ticket-domain.util.js";

const HOLD_DURATION_MS = parseInt(process.env.TICKET_HOLD_DURATION_MS || "600000", 10);

interface RawTier {
  id: string;
  name: string;
  price: number | string;
  available_stock: number;
  event_id: string;
}

/**
 * Create a Ticket holding
 */
export const holdTicket = async (
  userId: string,
  ticketTierId: string,
  quantity: number = 1,
  customHoldDurationMs: number | null = null
) => {
  const holdDuration =
    process.env.NODE_ENV !== "production" && customHoldDurationMs
      ? customHoldDurationMs
      : HOLD_DURATION_MS;

  let eventId: string | undefined;

  const results = await prismaClient.$transaction(
    async (tx) => {
      const tiers = await tx.$queryRaw<RawTier[]>`
        SELECT id, name, price, available_stock, event_id 
        FROM "ticket_tiers" 
        WHERE id = ${ticketTierId}
        FOR UPDATE
      `;

      const tier = tiers[0];
      if (!tier) {
        throw new NotFoundError("Ticket tier not found");
      }

      eventId = tier.event_id;

      // Validate Event status and Flash-Sale Window
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: { status: true, saleStartTime: true, saleEndTime: true },
      });

      if (!event) {
        throw new NotFoundError("Event not found");
      }

      validateFlashSaleWindow(event);

      if (tier.available_stock < quantity) {
        throw new ConflictError("Insufficient stock");
      }

      await tx.ticketTier.update({
        where: { id: ticketTierId },
        data: {
          availableStock: { decrement: quantity },
        },
      });

      const expiresAt = new Date(Date.now() + holdDuration);
      const order = await tx.order.create({
        data: {
          userId,
          ticketTierId,
          quantity,
          totalAmount: Number(tier.price) * quantity,
          status: "PENDING",
          expiresAt,
        },
        include: {
          ticketTier: {
            include: {
              event: {
                select: { id: true, title: true, bannerUrl: true },
              },
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          orderId: order.id,
          action: "TICKET_HOLD",
          details: `Hold ${quantity} tickets for order ${order.id}`,
        },
      });

      return order;
    },
    { timeout: 10000 }
  );

  if (eventId) {
    await CacheUtil.del(CacheKeys.EVENT_DETAILS(eventId));
    await ticketReleaseQueue.add(
      "release-ticket",
      {
        orderId: results.id,
        ticketTierId: ticketTierId,
        quantity: quantity,
        eventId: eventId,
      },
      {
        delay: holdDuration,
        jobId: `release-${results.id}`,
      }
    );
  }

  return results;
};
