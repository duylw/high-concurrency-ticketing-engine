import { prismaClient } from "../config/db.js";
import { CacheKeys } from "../constants/cacheKeys.js";
import { CacheUtil } from "../utils/cache.util.js";
import { ConflictError, NotFoundError } from "../errors/AppError.js";

/**
 * Create a Ticket holding
 *
 * @param {string} userId - ID of authenticated user
 * @param {string} ticketTierId - ID of ticket tier
 * @param {number} quantity - Quantity of tickets
 * @returns {Promise<Object>} Created Ticket holding
 */
export const holdTicket = async (userId, ticketTierId, quantity = 1) => {

    let eventId;

    const results = await prismaClient.$transaction(async (tx) => {
        const [tier] = await tx.$queryRaw`
            SELECT id, name, price, available_stock, event_id 
            FROM "ticket_tiers" 
            WHERE id = ${ticketTierId}
            FOR UPDATE
        `;

        if (!tier)
            throw new NotFoundError("Ticket tier not found");

        eventId = tier.event_id;

        if (tier.available_stock < quantity)
            throw new ConflictError("Insufficient stock");

        await tx.ticketTier.update({
            where: { id: ticketTierId },
            data: {
                availableStock: { decrement: quantity },
            },
        });

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const order = await tx.order.create({
            data: {
                userId,
                ticketTierId,
                quantity,
                totalAmount: Number(tier.price) * quantity,
                status: "PENDING",
                expiresAt,
            },
        });

        return order;
    }, { timeout: 10000 })

    await CacheUtil.del(CacheKeys.EVENT_DETAILS(eventId))

    return results;
}