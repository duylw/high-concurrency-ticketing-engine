import { Worker } from "bullmq";
import { connection } from "../config/queue.js";
import { prismaClient } from "../config/db.js";
import { CacheUtil } from "../utils/cache.util.js";
import { CacheKeys } from "../constants/cacheKeys.js";

export const ticketReleaseWorker = new Worker(
    "ticket-release",
    async (job) => {
        const { orderId, ticketTierId, quantity, eventId } = job.data;
        console.log(`[WORKER] Processing ticket release for Order: ${orderId}`);

        const order = await prismaClient.order.findUnique({
            where: { id: orderId }
        })

        if (!order || order.status !== "PENDING") {
            console.log(`[WORKER] Order ${orderId} not found or status is not PENDING`);
            return;
        }

        await prismaClient.$transaction(async (tx) => {
            await tx.order.update({
                where: { id: orderId },
                data: { status: "EXPIRED" }
            });

            await tx.ticketTier.update({
                where: { id: ticketTierId },
                data: {
                    availableStock: { increment: quantity }
                }
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

        console.log(`[WORKER] Order ${orderId} processed successfully`);
    },
    {
        connection,
    }
);

ticketReleaseWorker.on("failed", (job, err) => {
    console.error(`[WORKER ERROR] Job ${job?.id} failed:`, err.message);
});
