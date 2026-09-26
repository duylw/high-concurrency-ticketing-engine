import { Worker, Job } from "bullmq";
import { connection } from "../config/queue.js";
import { prismaClient } from "../config/db.js";
import { CacheUtil } from "../utils/cache.util.js";
import { CacheKeys } from "../constants/cacheKeys.js";
import { logger } from "../utils/logger.util.js";

export interface TicketReleaseJobData {
  orderId: string;
  ticketTierId: string;
  quantity: number;
  eventId: string;
}

export const ticketReleaseWorker = new Worker<TicketReleaseJobData>(
  "ticket-release",
  async (job: Job<TicketReleaseJobData>) => {
    const { orderId, ticketTierId, quantity, eventId } = job.data;
    logger.info({ jobId: job.id, orderId, ticketTierId, quantity }, `[WORKER] Processing ticket release for Order: ${orderId}`);

    const order = await prismaClient.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.status !== "PENDING") {
      logger.warn({ jobId: job.id, orderId, status: order?.status }, `[WORKER] Order ${orderId} skipped (status is not PENDING)`);
      return;
    }

    await prismaClient.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "EXPIRED" },
      });

      await tx.ticketTier.update({
        where: { id: ticketTierId },
        data: {
          availableStock: { increment: quantity },
        },
      });

      await tx.auditLog.create({
        data: {
          orderId,
          action: "TICKET_RELEASED_TIMEOUT",
          details: `Hold expired. Returned ${quantity} tickets to available stock.`,
        },
      });
    });

    await CacheUtil.del(CacheKeys.EVENT_DETAILS(eventId));

    logger.info({ jobId: job.id, orderId, restoredQuantity: quantity }, `[WORKER] Order ${orderId} tickets released successfully`);
  },
  {
    connection,
  }
);

ticketReleaseWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, `[WORKER ERROR] Job ${job?.id} failed: ${err.message}`);
});
