import { Worker, Job } from "bullmq";
import { connection } from "../config/queue.js";

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
    const { orderId } = job.data;

    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log(`[WORKER] Processed notification for Order: ${orderId}`);
  },
  { connection }
);

notificationWorker.on("failed", (job, err) => {
  console.error(`[WORKER ERROR] Job ${job?.id} failed:`, err.message);
});
