import { Worker, Job } from "bullmq";
import { connection } from "../config/queue.js";
import { logger } from "../utils/logger.util.js";

export interface NotificationJobData {
  orderId: string;
  userEmail: string;
  eventTitle: string;
  quantity: number;
  totalAmount: number;
}

export const notificationWorker = new Worker<NotificationJobData>(
  "notification",
  async (job: Job<NotificationJobData>) => {
    const { orderId, userEmail, eventTitle } = job.data;

    await new Promise((resolve) => setTimeout(resolve, 500));

    logger.info({ jobId: job.id, orderId, userEmail, eventTitle }, `[WORKER] Notification sent for Order: ${orderId}`);
  },
  { connection }
);

notificationWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, `[WORKER ERROR] Job ${job?.id} failed: ${err.message}`);
});
