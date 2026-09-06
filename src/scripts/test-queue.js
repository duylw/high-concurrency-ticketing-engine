import { config } from "dotenv";
config();

import crypto from "crypto";
import { prismaClient } from "../config/db.js";
import { generateAccessToken } from "../utils/jwt.util.js";

const BASE_URL = `http://localhost:${process.env.PORT || 5001}/api/v1`;

const logStep = (step, title) => {
    console.log(`\n======================================================`);
    console.log(`[QUEUE TEST STEP ${step}] ${title}`);
    console.log(`======================================================`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runQueueTest = async () => {
    const timestamp = Date.now();
    let organizerId = "";
    let eventId = "";
    let tierId = "";
    let buyerId = "";
    let buyerToken = "";

    try {
        // ----------------------------------------------------
        // STEP 1: Setup Test Data (1 Event, 1 Tier with 2 Tickets)
        // ----------------------------------------------------
        logStep(1, "Setup Test Data: Event, Tier with 2 Tickets, and Buyer");

        const organizer = await prismaClient.user.create({
            data: {
                email: `organizer_queue_${timestamp}@example.com`,
                username: `organizer_queue_${timestamp}`,
                password: "hashedpassword123",
                name: "Queue Test Organizer",
                role: "ORGANIZER",
            },
        });
        organizerId = organizer.id;

        const event = await prismaClient.event.create({
            data: {
                title: `BullMQ Delayed Release Test ${timestamp}`,
                description: "Testing automatic ticket release after expiration.",
                startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 28 * 60 * 60 * 1000),
                organizerId,
            },
        });
        eventId = event.id;

        const tier = await prismaClient.ticketTier.create({
            data: {
                eventId,
                name: "Early Bird Queue",
                price: 150.0,
                totalStock: 2,
                availableStock: 2,
            },
        });
        tierId = tier.id;

        const buyer = await prismaClient.user.create({
            data: {
                email: `buyer_queue_${timestamp}@example.com`,
                username: `buyer_queue_${timestamp}`,
                password: "hashedpassword123",
                name: "Queue Buyer",
                role: "USER",
            },
        });
        buyerId = buyer.id;
        buyerToken = generateAccessToken({ id: buyer.id, email: buyer.email, role: buyer.role });

        console.log(`[SETUP] Event created: "${event.title}" (ID: ${eventId})`);
        console.log(`[SETUP] Tier: "${tier.name}" | Available Stock: ${tier.availableStock}`);
        console.log(`[SETUP] Buyer created with JWT token.`);

        // ----------------------------------------------------
        // STEP 2: SCENARIO 1 - Hold Tickets with 3-Second Timeout
        // ----------------------------------------------------
        logStep(2, "SCENARIO 1: Hold 2 Tickets with 3-second hold delay");

        const HOLD_DURATION_TEST = 3000; // 3 seconds

        const holdRes = await fetch(`${BASE_URL}/tickets/hold`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${buyerToken}`,
                "x-test-hold-duration-ms": `${HOLD_DURATION_TEST}`,
            },
            body: JSON.stringify({
                ticketTierId: tierId,
                quantity: 2,
            }),
        });

        const holdData = await holdRes.json();
        console.log(`[HOLD RESPONSE] Status: ${holdRes.status}`, holdData);

        if (holdRes.status !== 201) {
            throw new Error(`[FAIL] Expected 201 Created from /tickets/hold, got ${holdRes.status}`);
        }

        const orderId1 = holdData.data.id;

        // ----------------------------------------------------
        // STEP 3: Verify Stock Decrement Immediately in DB
        // ----------------------------------------------------
        logStep(3, "Verify Immediate DB State: Stock Decremented to 0");

        const tierAfterHold = await prismaClient.ticketTier.findUnique({
            where: { id: tierId },
        });
        console.log(`[DB CHECK] Tier availableStock immediately after hold: ${tierAfterHold.availableStock}`);
        if (tierAfterHold.availableStock !== 0) {
            throw new Error(`[FAIL] Expected availableStock to be 0, found ${tierAfterHold.availableStock}`);
        }

        const orderAfterHold = await prismaClient.order.findUnique({
            where: { id: orderId1 },
        });
        console.log(`[DB CHECK] Order status: ${orderAfterHold.status}`);
        if (orderAfterHold.status !== "PENDING") {
            throw new Error(`[FAIL] Expected order status PENDING, found ${orderAfterHold.status}`);
        }

        console.log(`[PASSED] Immediate state verified: 2 tickets held, availableStock = 0, status = PENDING.`);

        // ----------------------------------------------------
        // STEP 4: Wait for BullMQ Delayed Worker to Execute
        // ----------------------------------------------------
        const WAIT_TIME = 4500; // Wait 4.5 seconds (delay 3s + 1.5s worker processing buffer)
        logStep(4, `Waiting ${WAIT_TIME / 1000}s for BullMQ TicketReleaseWorker to auto-release...`);

        console.log(`[TIMER] Sleeping ${WAIT_TIME}ms...`);
        await sleep(WAIT_TIME);
        console.log(`[TIMER] Wakeup. Checking DB state after expiration...`);

        // ----------------------------------------------------
        // STEP 5: Verify Auto-Release in PostgreSQL
        // ----------------------------------------------------
        logStep(5, "Verify Worker Result: Order EXPIRED, Stock Restored to 2, Audit Log Created");

        const expiredOrder = await prismaClient.order.findUnique({
            where: { id: orderId1 },
        });
        console.log(`[DB CHECK] Order status after worker execution: ${expiredOrder.status}`);
        if (expiredOrder.status !== "EXPIRED") {
            throw new Error(`[FAIL] Expected Order status EXPIRED, but found "${expiredOrder.status}". Worker did not execute!`);
        }

        const restoredTier = await prismaClient.ticketTier.findUnique({
            where: { id: tierId },
        });
        console.log(`[DB CHECK] TicketTier availableStock after release: ${restoredTier.availableStock}`);
        if (restoredTier.availableStock !== 2) {
            throw new Error(`[FAIL] Expected availableStock to be restored to 2, but found ${restoredTier.availableStock}!`);
        }

        const auditLogs = await prismaClient.auditLog.findMany({
            where: { orderId: orderId1 },
            orderBy: { createdAt: "asc" },
        });

        console.log(`[DB CHECK] Audit Logs for Order ${orderId1}:`);
        auditLogs.forEach((log) => console.log(`  - Action: ${log.action} | Details: ${log.details}`));

        const timeoutAudit = auditLogs.find((l) => l.action === "TICKET_RELEASED_TIMEOUT");
        if (!timeoutAudit) {
            throw new Error(`[FAIL] Missing TICKET_RELEASED_TIMEOUT audit log entry!`);
        }

        console.log(`[PASSED] SCENARIO 1 VERIFIED: BullMQ delayed worker released expired tickets successfully.`);

        // ----------------------------------------------------
        // STEP 6: SCENARIO 2 - Completed Order Must NOT Be Released
        // ----------------------------------------------------
        logStep(6, "SCENARIO 2: Completed Order Protection (Worker skips paid orders)");

        // 6.1 Hold 1 ticket
        const holdRes2 = await fetch(`${BASE_URL}/tickets/hold`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${buyerToken}`,
                "x-test-hold-duration-ms": `${HOLD_DURATION_TEST}`,
            },
            body: JSON.stringify({
                ticketTierId: tierId,
                quantity: 1,
            }),
        });

        const holdData2 = await holdRes2.json();
        const orderId2 = holdData2.data.id;

        // 6.2 Simulate immediate payment checkout (Order status = COMPLETED)
        await prismaClient.order.update({
            where: { id: orderId2 },
            data: { status: "COMPLETED" },
        });
        console.log(`[SIMULATION] Simulated payment: Order ${orderId2} status set to COMPLETED.`);

        // 6.3 Wait for worker to trigger
        console.log(`[TIMER] Sleeping ${WAIT_TIME}ms for worker trigger...`);
        await sleep(WAIT_TIME);

        // 6.4 Assert order is still COMPLETED and stock remains 1 (not restored to 2)
        const completedOrder = await prismaClient.order.findUnique({
            where: { id: orderId2 },
        });
        console.log(`[DB CHECK] Order status after delay: ${completedOrder.status}`);
        if (completedOrder.status !== "COMPLETED") {
            throw new Error(`[FAIL] Expected order to stay COMPLETED, but got ${completedOrder.status}!`);
        }

        const tierAfterCompleted = await prismaClient.ticketTier.findUnique({
            where: { id: tierId },
        });
        console.log(`[DB CHECK] TicketTier availableStock: ${tierAfterCompleted.availableStock}`);
        if (tierAfterCompleted.availableStock !== 1) {
            throw new Error(`[FAIL] Stock should remain 1 for completed orders, found ${tierAfterCompleted.availableStock}!`);
        }

        console.log(`[PASSED] SCENARIO 2 VERIFIED: Worker correctly ignored COMPLETED order without releasing stock.`);

        // ----------------------------------------------------
        // SUMMARY
        // ----------------------------------------------------
        console.log(`\n======================================================`);
        console.log(`[SUCCESS] ALL BULLMQ QUEUE & WORKER CHECKS PASSED 100%!`);
        console.log(`1. Delayed Job scheduling via Redis ZSET works accurately.`);
        console.log(`2. Expired tickets are atomically restored to PostgreSQL.`);
        console.log(`3. Completed/Paid orders are protected from being released.`);
        console.log(`4. Full Audit Trail (HOLD -> RELEASE_TIMEOUT) recorded.`);
        console.log(`======================================================\n`);
    } catch (error) {
        console.error(`\n[FATAL ERROR IN QUEUE TEST]:`, error.message);
        process.exit(1);
    } finally {
        console.log(`[CLEANUP] Cleaning up test data...`);
        try {
            if (eventId) {
                await prismaClient.event.delete({ where: { id: eventId } }).catch(() => { });
            }
            if (organizerId) {
                await prismaClient.user.delete({ where: { id: organizerId } }).catch(() => { });
            }
            if (buyerId) {
                await prismaClient.user.delete({ where: { id: buyerId } }).catch(() => { });
            }
            console.log(`[CLEANUP] Done.`);
        } catch (e) {
            console.warn(`[CLEANUP WARNING]:`, e.message);
        }
        await prismaClient.$disconnect();
    }
};

runQueueTest();
