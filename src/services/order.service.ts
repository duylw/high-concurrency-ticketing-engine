import crypto from "crypto";
import { prismaClient } from "../config/db.js";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "../errors/AppError.js";
import { notificationQueue } from "../config/queue.js";

export const checkout = async (
  orderId: string,
  userId: string,
  idempotencyKey?: string
) => {
  const order = await prismaClient.order.findUnique({
    where: {
      id: orderId,
    },
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  if (order.userId !== userId) {
    throw new ForbiddenError("You are not authorized to checkout this order");
  }

  if (order.status !== "PENDING") {
    throw new BadRequestError("Order is not in PENDING status");
  }

  if (new Date() > new Date(order.expiresAt)) {
    throw new BadRequestError("Order has expired");
  }

  const completedOrder = await prismaClient.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: "COMPLETED",
        ...(idempotencyKey && { idempotencyKey }),
      },
      include: {
        ticketTier: { include: { event: true } },
        user: true,
      },
    });

    const ticketsData = [];
    const datePrefix = new Date().toISOString().slice(0, 7).replace("-", "");
    const shortOrderId = order.id.slice(0, 8).toUpperCase();

    for (let i = 1; i <= order.quantity; i++) {
      const ticketId = crypto.randomUUID();
      const ticketCode = `TKT-${datePrefix}-${shortOrderId}-${String(i).padStart(2, "0")}`;
      const qrPayload = JSON.stringify({
        ticketId,
        ticketCode,
        orderId: order.id,
        ticketIndex: i,
        totalInOrder: order.quantity,
        eventId: updatedOrder.ticketTier?.event?.id,
        eventTitle: updatedOrder.ticketTier?.event?.title,
        tierName: updatedOrder.ticketTier?.name,
        userId: updatedOrder.userId,
        attendeeName: updatedOrder.user?.name || updatedOrder.user?.email || "Attendee",
        status: "ISSUED",
      });
      ticketsData.push({
        id: ticketId,
        orderId: order.id,
        ticketTierId: order.ticketTierId,
        ticketCode,
        qrPayload,
        status: "ISSUED" as const,
        attendeeName: updatedOrder.user?.name || updatedOrder.user?.email || "Attendee",
      });
    }
    await tx.ticket.createMany({
      data: ticketsData,
    });

    await tx.auditLog.create({
      data: {
        orderId: order.id,
        action: "ORDER_CHECKOUT_COMPLETED",
        details: `Payment completed. Issued ${order.quantity} individual tickets.`,
      },
    });

    const issuedTickets = await tx.ticket.findMany({
      where: { orderId: order.id },
      orderBy: { ticketCode: "asc" },
    });

    return {
      ...updatedOrder,
      tickets: issuedTickets,
    };
  });

  await notificationQueue.add("send_ticket_email", {
    orderId: completedOrder.id,
    userEmail: completedOrder.user.email,
    eventTitle: completedOrder.ticketTier.event.title,
    quantity: completedOrder.quantity,
    totalAmount: completedOrder.totalAmount,
  });

  return {
    ...completedOrder,
    qrPayload: JSON.stringify({
      orderId: completedOrder.id,
      eventId: completedOrder.ticketTier?.event?.id,
      eventTitle: completedOrder.ticketTier?.event?.title,
      tierName: completedOrder.ticketTier?.name,
      quantity: completedOrder.quantity,
      userId: completedOrder.userId,
      status: completedOrder.status,
    }),
  };
};

/**
 * Get all orders placed by the current user
 */
export const getMyOrders = async (userId: string) => {
  const orders = await prismaClient.order.findMany({
    where: { userId },
    include: {
      tickets: {
        orderBy: { ticketCode: "asc" },
      },
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
 * Supports itemized ticketId (UUID), ticketCode (e.g. TKT-202609-XXXX-01), or legacy orderId (UUID).
 */
export const checkInOrder = async (
  staffUserId: string,
  staffRole: string,
  identifier: string
) => {
  // Validate whether identifier is a standard UUID format to prevent PostgreSQL 22P02 syntax errors
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  // 1. First attempt to lookup by itemized Ticket
  const ticketWhere = isUuid
    ? { OR: [{ id: identifier }, { ticketCode: identifier }] }
    : { ticketCode: identifier };

  const ticket = await prismaClient.ticket.findFirst({
    where: ticketWhere,
    include: {
      ticketTier: {
        include: { event: true },
      },
      order: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  // 2. If itemized Ticket is found, process individual check-in with Anti-Passback defense
  if (ticket) {
    // Authorization check: Must be ADMIN or event organizer
    if (staffRole !== "ADMIN" && ticket.ticketTier.event.organizerId !== staffUserId) {
      throw new ForbiddenError("You are not authorized to check in tickets for this event");
    }

    // Anti-Passback defense: Check if this specific ticket was already used
    if (ticket.status === "CHECKED_IN") {
      const timeStr = ticket.checkedInAt
        ? new Date(ticket.checkedInAt).toLocaleTimeString("vi-VN")
        : "earlier";
      throw new ConflictError(`Ticket has ALREADY been used for check-in at ${timeStr}!`);
    }

    if (ticket.status === "REVOKED") {
      throw new BadRequestError("Ticket has been REVOKED and cannot be used.");
    }

    // Validate parent order status: Must be COMPLETED or PARTIALLY_CHECKED_IN
    if (ticket.order.status !== "COMPLETED" && ticket.order.status !== "PARTIALLY_CHECKED_IN") {
      throw new BadRequestError(
        `Cannot check-in ticket with order status '${ticket.order.status}'. Only COMPLETED orders can be checked in.`
      );
    }

    const checkedInResult = await prismaClient.$transaction(async (tx) => {
      // Mark individual ticket as CHECKED_IN
      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "CHECKED_IN",
          checkedInAt: new Date(),
        },
        include: {
          ticketTier: { include: { event: true } },
          order: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      // Count remaining unchecked tickets in this order
      const remainingTickets = await tx.ticket.count({
        where: {
          orderId: ticket.orderId,
          status: { not: "CHECKED_IN" },
        },
      });

      // If 0 remaining unchecked tickets -> whole order is CHECKED_IN, otherwise PARTIALLY_CHECKED_IN
      const newOrderStatus = remainingTickets === 0 ? "CHECKED_IN" : "PARTIALLY_CHECKED_IN";

      await tx.order.update({
        where: { id: ticket.orderId },
        data: { status: newOrderStatus },
      });

      // Record audit log entry
      await tx.auditLog.create({
        data: {
          orderId: ticket.orderId,
          action: "TICKET_CHECKED_IN",
          details: JSON.stringify({
            ticketId: ticket.id,
            ticketCode: ticket.ticketCode,
            checkedInBy: staffUserId,
            checkedInAt: new Date().toISOString(),
            orderStatus: newOrderStatus,
            remainingTickets,
          }),
        },
      });

      // Return structured response compatible with Gate Scanner UI and REST API
      return {
        id: updatedTicket.id,
        ticketCode: updatedTicket.ticketCode,
        status: updatedTicket.status,
        checkedInAt: updatedTicket.checkedInAt,
        attendeeName: updatedTicket.attendeeName,
        user: updatedTicket.order.user,
        ticketTier: updatedTicket.ticketTier,
        quantity: 1,
        order: {
          id: updatedTicket.orderId,
          status: newOrderStatus,
          quantity: updatedTicket.order.quantity,
          remainingTickets,
        },
      };
    });

    return checkedInResult;
  }

  // 3. Fallback: Legacy check-in via Order ID (if identifier is UUID)
  if (!isUuid) {
    throw new NotFoundError("Ticket or Order not found");
  }

  const order = await prismaClient.order.findUnique({
    where: { id: identifier },
    include: {
      ticketTier: {
        include: { event: true },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
      tickets: true,
    },
  });

  if (!order) {
    throw new NotFoundError("Order or Ticket not found");
  }

  if (staffRole !== "ADMIN" && order.ticketTier.event.organizerId !== staffUserId) {
    throw new ForbiddenError("You are not authorized to check in tickets for this event");
  }

  if (order.status === "CHECKED_IN") {
    throw new ConflictError("Ticket has ALREADY been used for check-in!");
  }

  if (order.status !== "COMPLETED" && order.status !== "PARTIALLY_CHECKED_IN") {
    throw new BadRequestError(
      `Cannot check-in ticket with status '${order.status}'. Only COMPLETED orders can be checked in.`
    );
  }

  const checkedInOrder = await prismaClient.$transaction(async (tx) => {
    // If order contains itemized tickets, check in all remaining tickets
    if (order.tickets && order.tickets.length > 0) {
      await tx.ticket.updateMany({
        where: { orderId: order.id, status: { not: "CHECKED_IN" } },
        data: {
          status: "CHECKED_IN",
          checkedInAt: new Date(),
        },
      });
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data: { status: "CHECKED_IN" },
      include: {
        ticketTier: { include: { event: true } },
        user: { select: { id: true, name: true, email: true } },
        tickets: true,
      },
    });

    await tx.auditLog.create({
      data: {
        orderId: order.id,
        action: "TICKET_CHECKED_IN",
        details: JSON.stringify({
          checkedInBy: staffUserId,
          checkedInAt: new Date().toISOString(),
          mode: "LEGACY_ORDER_CHECKIN",
        }),
      },
    });

    return updated;
  });

  return checkedInOrder;
};
