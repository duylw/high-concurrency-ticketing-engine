import { Worker } from "bullmq";
import { connection } from "../config/queue.js";

export const notificationWorker = new Worker(
    "notification",
    async (job) => {
        const { orderId, userEmail, eventTitle, quantity, totalAmount } = job.data

        await new Promise((resolve) => setTimeout(resolve, 500));

        console.log(`[WORKER] Processed notification for Order: ${orderId}`);
    },
    { connection }
)

notificationWorker.on("failed", (job, err) => {
    console.error(`[WORKER ERROR] Job ${job?.id} failed:`, err.message);
});
