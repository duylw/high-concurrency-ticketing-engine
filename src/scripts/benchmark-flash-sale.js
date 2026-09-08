import { config } from "dotenv";
config();

import { prismaClient } from "../config/db.js";
import { redisClient } from "../config/redis.js";
import { generateAccessToken } from "../utils/jwt.util.js";
import { CacheKeys } from "../constants/cacheKeys.js";

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

const logHeader = (title) => {
    console.log(`\n======================================================`);
    console.log(title);
    console.log(`======================================================`);
};

const runFlashSaleBenchmark = async () => {
    const timestamp = Date.now();
    let organizerId = "";
    let eventId = "";
    let tierId = "";
    const createdUserIds = [];
    const TOTAL_STOCK = 50;
    const CONCURRENT_USERS = 250;

    try {
        logHeader(`[BENCHMARK-FLASH-SALE] STEP 1: Setting up Flash-Sale Event (${TOTAL_STOCK} tickets, ${CONCURRENT_USERS} buyers)`);

        // 1. Create Organizer
        const organizer = await prismaClient.user.create({
            data: {
                email: `organizer_flash_${timestamp}@example.com`,
                username: `organizer_flash_${timestamp}`,
                password: "hashedpassword123",
                name: "Flash Sale Organizer",
                role: "ORGANIZER",
            },
        });
        organizerId = organizer.id;
        createdUserIds.push(organizerId);

        // 2. Create Event
        const event = await prismaClient.event.create({
            data: {
                title: `Stress-Test Flash Concert ${timestamp}`,
                description: "Event for testing high-concurrency ticket locking.",
                startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
                organizerId,
            },
        });
        eventId = event.id;

        // 3. Create Ticket Tier with exactly TOTAL_STOCK tickets
        const tier = await prismaClient.ticketTier.create({
            data: {
                eventId,
                name: "Limited Early Bird",
                price: 150.0,
                totalStock: TOTAL_STOCK,
                availableStock: TOTAL_STOCK,
            },
        });
        tierId = tier.id;

        console.log(`[SETUP] Event ID: ${eventId} | Tier ID: ${tierId}`);
        console.log(`[SETUP] Initial Stock: ${tier.availableStock} tickets.`);

        // ----------------------------------------------------
        // STEP 2: Pre-create Users and Tokens
        // ----------------------------------------------------
        logHeader(`[BENCHMARK-FLASH-SALE] STEP 2: Pre-generating ${CONCURRENT_USERS} Distinct Users & Auth Tokens`);

        const usersData = Array.from({ length: CONCURRENT_USERS }, (_, i) => ({
            email: `buyer_${timestamp}_${i}@example.com`,
            username: `buyer_${timestamp}_${i}`,
            password: "hashedpassword123",
            name: `Buyer ${i}`,
            role: "USER",
        }));

        await prismaClient.user.createMany({ data: usersData });

        const createdUsers = await prismaClient.user.findMany({
            where: { email: { startsWith: `buyer_${timestamp}_` } },
            select: { id: true, email: true, role: true },
        });

        createdUsers.forEach((u) => createdUserIds.push(u.id));

        const userTokens = createdUsers.map((u) => generateAccessToken(u));
        console.log(`[SETUP] Generated ${userTokens.length} active JWT access tokens.`);

        // ----------------------------------------------------
        // STEP 3: Dispatch Concurrent Hold Requests
        // ----------------------------------------------------
        logHeader(`[BENCHMARK-FLASH-SALE] STEP 3: Firing ${CONCURRENT_USERS} Concurrent Hold Requests (Pessimistic Locking)`);
        console.log(`[INFO] All ${CONCURRENT_USERS} requests hitting POST /api/v1/tickets/hold simultaneously...`);

        const latencies = [];
        const statusCounts = {};

        const tStart = performance.now();

        const requests = userTokens.map(async (token, index) => {
            const reqStart = performance.now();
            try {
                const res = await fetch(`${BASE_URL}/tickets/hold`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        ticketTierId: tierId,
                        quantity: 1,
                    }),
                });
                const reqEnd = performance.now();
                latencies.push(reqEnd - reqStart);

                const data = await res.json();
                statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
                return { status: res.status, data };
            } catch (err) {
                const reqEnd = performance.now();
                latencies.push(reqEnd - reqStart);
                statusCounts["NETWORK_ERROR"] = (statusCounts["NETWORK_ERROR"] || 0) + 1;
                return { status: "NETWORK_ERROR", error: err.message };
            }
        });

        const results = await Promise.all(requests);
        const tEnd = performance.now();
        const totalDurationMs = tEnd - tStart;

        // ----------------------------------------------------
        // STEP 4: Verification in PostgreSQL
        // ----------------------------------------------------
        logHeader(`[BENCHMARK-FLASH-SALE] STEP 4: Database ACID Integrity Check`);

        const updatedTier = await prismaClient.ticketTier.findUnique({
            where: { id: tierId },
        });

        const heldOrders = await prismaClient.order.findMany({
            where: { ticketTierId: tierId, status: "PENDING" },
        });

        const auditLogs = await prismaClient.auditLog.findMany({
            where: { action: "TICKET_HOLD" },
        });

        const successCount = statusCounts[201] || 0;
        const soldOutCount = statusCounts[409] || 0;
        const errorCount = statusCounts[500] || 0;

        latencies.sort((a, b) => a - b);
        const p50 = latencies[Math.floor(latencies.length * 0.5)].toFixed(2);
        const p95 = latencies[Math.floor(latencies.length * 0.95)].toFixed(2);
        const p99 = latencies[Math.floor(latencies.length * 0.99)].toFixed(2);
        const avg = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
        const writeRps = Math.round((CONCURRENT_USERS / totalDurationMs) * 1000);

        console.log(`
+------------------------------------------------------------------------+
|                   FLASH SALE STRESS TEST METRICS                       |
+------------------------------------------------------------------------+
| Metric                           | Value                               |
+----------------------------------+-------------------------------------+
| Total Concurrent Requests        | ${String(CONCURRENT_USERS).padEnd(36)}|
| Initial Available Stock          | ${String(TOTAL_STOCK).padEnd(36)}|
| Successful Holds (HTTP 201)      | ${String(successCount).padEnd(36)}|
| Rejected "Sold Out" (HTTP 409)   | ${String(soldOutCount).padEnd(36)}|
| Server Errors (HTTP 500)         | ${String(errorCount).padEnd(36)}|
| Final Stock in Database          | ${String(updatedTier.availableStock).padEnd(36)}|
| Database Orders Created          | ${String(heldOrders.length).padEnd(36)}|
| Total Batch Duration             | ${(totalDurationMs.toFixed(2) + " ms").padEnd(36)}|
| Write Throughput (Pessimistic)   | ${(writeRps + " req/sec").padEnd(36)}|
| Latency Avg                      | ${(avg + " ms").padEnd(36)}|
| Latency p50                      | ${(p50 + " ms").padEnd(36)}|
| Latency p95                      | ${(p95 + " ms").padEnd(36)}|
| Latency p99                      | ${(p99 + " ms").padEnd(36)}|
+----------------------------------+-------------------------------------+
`);

        // Check exact criteria
        const isStockZero = updatedTier.availableStock === 0;
        const isOrdersExact = heldOrders.length === TOTAL_STOCK;
        const isSuccessExact = successCount === TOTAL_STOCK;
        const isNoOverselling = isStockZero && isOrdersExact && isSuccessExact;

        if (isNoOverselling) {
            console.log(`[PASSED] ZERO OVERSELLING CONFIRMED: Exactly ${TOTAL_STOCK} out of ${CONCURRENT_USERS} requests succeeded.`);
            console.log(`[PASSED] Database consistency maintained perfectly under pessimistic locking.`);
        } else {
            console.error(`[FAILED] Inconsistency detected! Check stock and orders.`);
        }

    } catch (error) {
        console.error(`[BENCHMARK-FLASH-SALE ERROR]`, error);
    } finally {
        logHeader(`[BENCHMARK-FLASH-SALE] STEP 5: Cleanup`);
        if (tierId) {
            await prismaClient.auditLog.deleteMany({ where: { order: { ticketTierId: tierId } } });
            await prismaClient.order.deleteMany({ where: { ticketTierId: tierId } });
            await prismaClient.ticketTier.deleteMany({ where: { id: tierId } });
            console.log(`[CLEANUP] Deleted orders, audit logs and ticket tier.`);
        }
        if (eventId) {
            await redisClient.del(CacheKeys.EVENT_DETAILS(eventId));
            await prismaClient.event.deleteMany({ where: { id: eventId } });
            console.log(`[CLEANUP] Deleted event ${eventId}.`);
        }
        if (createdUserIds.length > 0) {
            await prismaClient.user.deleteMany({
                where: { id: { in: createdUserIds } },
            });
            console.log(`[CLEANUP] Deleted ${createdUserIds.length} benchmark users.`);
        }
        await prismaClient.$disconnect();
        redisClient.disconnect();
    }
};

runFlashSaleBenchmark();
