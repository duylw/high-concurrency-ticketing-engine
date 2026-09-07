import { prismaClient } from "../config/db.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../errors/AppError.js";
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