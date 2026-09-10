import { prismaClient } from "../config/db.js";
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from "../errors/AppError.js";
import { notificationQueue } from "../config/queue.js";


export const checkout = async (orderId, userId, idempotencyKey) => {
    const order = await prismaClient.order.findUnique({
        where: {
            id: orderId
        }
    })

    if (!order) {
        throw new NotFoundError("Order not found")
    }

    if (order.userId != userId) {
        throw new ForbiddenError("You are not authorized to checkout this order")
    }

    if (order.status != "PENDING") {
        throw new BadRequestError(`Order is not in PENDING status`)
    }

    if (new Date() > new Date(order.expiresAt)) {
        throw new BadRequestError("Order has expired")
    }

    const completedOrder = await prismaClient.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
            where: { id: order.id },
            data: {
                status: "COMPLETED",
                idempotencyKey: idempotencyKey
            },
            include: {
                ticketTier: { include: { event: true } },
                user: true
            }
        })

        await tx.auditLog.create({
            data: {
                orderId: order.id,
                action: "ORDER_CHECKOUT_COMPLETED",
                details: `Payment completed successfully`
            }
        })

        return updatedOrder
    })

    await notificationQueue.add(
        "send_ticket_email",
        {
            orderId: completedOrder.id,
            userEmail: completedOrder.user.email,
            eventTitle: completedOrder.ticketTier.event.title,
            quantity: completedOrder.quantity,
            totalAmount: completedOrder.totalAmount
        }
    )

    return completedOrder
}

/**
 * Get all orders placed by the current user
 *
 * @param {string} userId - ID of authenticated user
 * @returns {Promise<Array>} List of orders with event & tier details
 */
export const getMyOrders = async (userId) => {
    const orders = await prismaClient.order.findMany({
        where: { userId },
        include: {
            ticketTier: {
                include: {
                    event: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            bannerUrl: true,
                            startTime: true,
                            endTime: true,
                            status: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return orders.map((order) => ({
        ...order,
        qrPayload: JSON.stringify({
            orderId: order.id,
            eventId: order.ticketTier?.event?.id,
            eventTitle: order.ticketTier?.event?.title,
            tierName: order.ticketTier?.name,
            quantity: order.quantity,
            userId: order.userId,
            status: order.status,
        }),
    }));
};

/**
 * Check-in a ticket at the gate (Staff / Organizer / Admin)
 *
 * @param {string} staffUserId - ID of staff performing check-in
 * @param {string} staffRole - Role of staff
 * @param {string} orderId - Order ID / Ticket ID
 * @returns {Promise<Object>} Checked-in order
 */
export const checkInOrder = async (staffUserId, staffRole, orderId) => {
    const order = await prismaClient.order.findUnique({
        where: { id: orderId },
        include: {
            ticketTier: {
                include: { event: true },
            },
            user: {
                select: { id: true, name: true, email: true },
            },
        },
    });

    if (!order) {
        throw new NotFoundError("Order not found");
    }

    // Permission check: Must be ADMIN or the organizer of the event
    if (staffRole !== "ADMIN" && order.ticketTier.event.organizerId !== staffUserId) {
        throw new ForbiddenError("You are not authorized to check in tickets for this event");
    }

    // Replay check: Cannot check-in twice
    if (order.status === "CHECKED_IN") {
        throw new ConflictError("Ticket has ALREADY been used for check-in!");
    }

    // Must be COMPLETED (paid)
    if (order.status !== "COMPLETED") {
        throw new BadRequestError(`Cannot check-in ticket with status '${order.status}'. Only COMPLETED orders can be checked in.`);
    }

    const checkedInOrder = await prismaClient.$transaction(async (tx) => {
        const updated = await tx.order.update({
            where: { id: order.id },
            data: { status: "CHECKED_IN" },
            include: {
                ticketTier: { include: { event: true } },
                user: { select: { id: true, name: true, email: true } },
            },
        });

        await tx.auditLog.create({
            data: {
                orderId: order.id,
                action: "TICKET_CHECKED_IN",
                details: JSON.stringify({
                    checkedInBy: staffUserId,
                    checkedInAt: new Date().toISOString(),
                }),
            },
        });

        return updated;
    });

    return checkedInOrder;
};