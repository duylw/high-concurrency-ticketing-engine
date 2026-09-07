import { config } from "dotenv";
config();

import crypto from "crypto";
import { prismaClient } from "../config/db.js";
import { generateAccessToken } from "../utils/jwt.util.js";

const BASE_URL = `http://localhost:${process.env.PORT || 5001}/api/v1`;

const logStep = (step, title) => {
    console.log(`\n======================================================`);
    console.log(`[CHECKOUT TEST STEP ${step}] ${title}`);
    console.log(`======================================================`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runCheckoutTest = async () => {
    const timestamp = Date.now();
    let organizerId = "";
    let eventId = "";
    let tierId = "";
    let buyer1Id = "";
    let buyer1Token = "";
    let buyer2Id = "";
    let buyer2Token = "";

    try {
        // ----------------------------------------------------
        // STEP 1: Setup Test Data (1 Event, 1 Tier with 10 Tickets)
        // ----------------------------------------------------
        logStep(1, "Setup Test Data: Organizer, Event, Tier (10 tickets), Buyer 1 and Buyer 2");

        const organizer = await prismaClient.user.create({
            data: {
                email: `organizer_checkout_${timestamp}@example.com`,
                username: `organizer_checkout_${timestamp}`,
                password: "hashedpassword123",
                name: "Checkout Organizer",
                role: "ORGANIZER",
            },
        });
        organizerId = organizer.id;

        const event = await prismaClient.event.create({
            data: {
                title: `Checkout & Idempotency Concert ${timestamp}`,
                description: "Testing order checkout with idempotency keys and background notifications.",
                startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 28 * 60 * 60 * 1000),
                organizerId,
            },
        });
        eventId = event.id;

        const tier = await prismaClient.ticketTier.create({
            data: {
                eventId,
                name: "VIP Checkout Tier",
                price: 250.0,
                totalStock: 10,
                availableStock: 10,
            },
        });
        tierId = tier.id;

        const buyer1 = await prismaClient.user.create({
            data: {
                email: `buyer1_checkout_${timestamp}@example.com`,
                username: `buyer1_checkout_${timestamp}`,
                password: "hashedpassword123",
                name: "Primary Buyer",
                role: "USER",
            },
        });
        buyer1Id = buyer1.id;
        buyer1Token = generateAccessToken({ id: buyer1.id, email: buyer1.email, role: buyer1.role });

        const buyer2 = await prismaClient.user.create({
            data: {
                email: `buyer2_checkout_${timestamp}@example.com`,
                username: `buyer2_checkout_${timestamp}`,
                password: "hashedpassword123",
                name: "Unauthorized Buyer",
                role: "USER",
            },
        });
        buyer2Id = buyer2.id;
        buyer2Token = generateAccessToken({ id: buyer2.id, email: buyer2.email, role: buyer2.role });

        console.log(`[SETUP] Event: "${event.title}" (ID: ${eventId})`);
        console.log(`[SETUP] Tier: "${tier.name}" | Available Stock: ${tier.availableStock}`);
        console.log(`[SETUP] Created Buyer 1 and Buyer 2 with access tokens.`);

        // Helper: Hold a ticket for buyer
        const holdTicketForBuyer = async (token, customDurationMs = null) => {
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };
            if (customDurationMs) {
                headers["x-test-hold-duration-ms"] = `${customDurationMs}`;
            }

            const res = await fetch(`${BASE_URL}/tickets/hold`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    ticketTierId: tierId,
                    quantity: 1,
                }),
            });
            const data = await res.json();
            return data.data;
        };

        // ----------------------------------------------------
        // STEP 2: Missing Idempotency Key Rejection (400 Bad Request)
        // ----------------------------------------------------
        logStep(2, "Test Missing X-Idempotency-Key Header Rejection");

        const order1 = await holdTicketForBuyer(buyer1Token);
        console.log(`[HOLD] Created Order 1: ${order1.id}`);

        const missingKeyRes = await fetch(`${BASE_URL}/orders/${order1.id}/checkout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${buyer1Token}`,
                // Missing X-Idempotency-Key
            },
        });

        console.log(`[RESPONSE] Missing Key Status: ${missingKeyRes.status}`);
        if (missingKeyRes.status !== 400) {
            throw new Error(`[FAIL] Expected 400 Bad Request when X-Idempotency-Key is missing, got ${missingKeyRes.status}`);
        }
        console.log(`[PASSED] Request without X-Idempotency-Key was correctly rejected with 400.`);

        // ----------------------------------------------------
        // STEP 3: Normal Checkout & State Transition to COMPLETED
        // ----------------------------------------------------
        logStep(3, "Test Normal Checkout Flow & Idempotency Key Assignment");

        const key1 = crypto.randomUUID();
        const checkoutRes1 = await fetch(`${BASE_URL}/orders/${order1.id}/checkout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${buyer1Token}`,
                "x-idempotency-key": key1,
            },
        });

        const checkoutData1 = await checkoutRes1.json();
        console.log(`[RESPONSE] Checkout Status: ${checkoutRes1.status}`, checkoutData1);

        if (checkoutRes1.status !== 200 && checkoutRes1.status !== 201) {
            throw new Error(`[FAIL] Expected 200/201 on valid checkout, got ${checkoutRes1.status}`);
        }

        // Verify Database State
        const dbOrder1 = await prismaClient.order.findUnique({ where: { id: order1.id } });
        console.log(`[DB CHECK] Order status: ${dbOrder1.status} | idempotencyKey: ${dbOrder1.idempotencyKey}`);
        if (dbOrder1.status !== "COMPLETED") {
            throw new Error(`[FAIL] Expected Order status COMPLETED, found ${dbOrder1.status}`);
        }
        if (dbOrder1.idempotencyKey !== key1) {
            throw new Error(`[FAIL] Expected idempotencyKey ${key1}, found ${dbOrder1.idempotencyKey}`);
        }

        // Verify Audit Log
        const auditLog1 = await prismaClient.auditLog.findFirst({
            where: { orderId: order1.id, action: "ORDER_CHECKOUT_COMPLETED" },
        });
        if (!auditLog1) {
            throw new Error(`[FAIL] Missing ORDER_CHECKOUT_COMPLETED audit log!`);
        }
        console.log(`[PASSED] Order completed successfully. Audit log verified.`);

        // ----------------------------------------------------
        // STEP 4: Idempotent Replay (Re-sending the same key after completion)
        // ----------------------------------------------------
        logStep(4, "Test Idempotent Replay: Cached Response & x-idempotent-replayed header");

        const replayRes = await fetch(`${BASE_URL}/orders/${order1.id}/checkout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${buyer1Token}`,
                "x-idempotency-key": key1,
            },
        });

        const isReplayed = replayRes.headers.get("x-idempotent-replayed");
        console.log(`[REPLAY] Status: ${replayRes.status} | x-idempotent-replayed: ${isReplayed}`);
        if (isReplayed !== "true") {
            throw new Error(`[FAIL] Expected 'x-idempotent-replayed: true' header on duplicate request!`);
        }

        const auditCount = await prismaClient.auditLog.count({
            where: { orderId: order1.id, action: "ORDER_CHECKOUT_COMPLETED" },
        });
        if (auditCount !== 1) {
            throw new Error(`[FAIL] Expected exactly 1 checkout audit log, but found ${auditCount}! Duplicate processing occurred.`);
        }
        console.log(`[PASSED] Duplicate request received cached response without triggering database logic twice.`);

        // ----------------------------------------------------
        // STEP 5: Double-Spending / Concurrency Attack (5 simultaneous requests with same key)
        // ----------------------------------------------------
        logStep(5, "FLASH ATTACK: 5 Simultaneous Checkout Requests with the SAME Idempotency Key");

        const order2 = await holdTicketForBuyer(buyer1Token);
        const concurrentKey = crypto.randomUUID();

        console.log(`[RACE] Launching 5 parallel checkout requests for Order ${order2.id}...`);
        const parallelPromises = Array.from({ length: 5 }, () =>
            fetch(`${BASE_URL}/orders/${order2.id}/checkout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${buyer1Token}`,
                    "x-idempotency-key": concurrentKey,
                },
            }).then(async (res) => ({
                status: res.status,
                body: await res.json().catch(() => ({})),
            }))
        );

        const parallelResults = await Promise.all(parallelPromises);
        const successResponses = parallelResults.filter((r) => r.status === 200 || r.status === 201);
        const conflictResponses = parallelResults.filter((r) => r.status === 409);

        console.log(`[RESULTS] Success (200/201): ${successResponses.length}`);
        console.log(`[RESULTS] Conflict / In-Progress (409): ${conflictResponses.length}`);

        if (successResponses.length !== 1) {
            throw new Error(`[FAIL] Expected exactly 1 successful request, but got ${successResponses.length}!`);
        }
        if (conflictResponses.length !== 4) {
            throw new Error(`[FAIL] Expected 4 conflict (409) responses, but got ${conflictResponses.length}!`);
        }
        console.log(`[PASSED] Redis Atomic Lock successfully blocked 4 concurrent duplicate requests.`);

        // ----------------------------------------------------
        // STEP 6: Authorization Defense (Buyer 2 cannot checkout Buyer 1's order)
        // ----------------------------------------------------
        logStep(6, "Test Authorization Defense: Forbidden (403) for other users");

        const order3 = await holdTicketForBuyer(buyer1Token);
        const key3 = crypto.randomUUID();

        const forbiddenRes = await fetch(`${BASE_URL}/orders/${order3.id}/checkout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${buyer2Token}`, // Buyer 2 token
                "x-idempotency-key": key3,
            },
        });

        console.log(`[RESPONSE] Unauthorized Buyer Status: ${forbiddenRes.status}`);
        if (forbiddenRes.status !== 403) {
            throw new Error(`[FAIL] Expected 403 Forbidden when checking out another user's order, got ${forbiddenRes.status}`);
        }
        console.log(`[PASSED] Ownership check strictly enforced. Buyer 2 rejected with 403.`);

        // ----------------------------------------------------
        // STEP 7: Expired Order Rejection (400 Bad Request)
        // ----------------------------------------------------
        logStep(7, "Test Expired Order Rejection: Cannot checkout expired hold");

        // Hold order with 1500ms duration
        const order4 = await holdTicketForBuyer(buyer1Token, 1500);
        console.log(`[HOLD] Created Order 4 with 1.5s timeout. Waiting 2.5s for BullMQ to expire it...`);
        await sleep(2500);

        const expiredCheckoutRes = await fetch(`${BASE_URL}/orders/${order4.id}/checkout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${buyer1Token}`,
                "x-idempotency-key": crypto.randomUUID(),
            },
        });

        console.log(`[RESPONSE] Expired Order Checkout Status: ${expiredCheckoutRes.status}`);
        if (expiredCheckoutRes.status !== 400) {
            throw new Error(`[FAIL] Expected 400 Bad Request when checking out expired order, got ${expiredCheckoutRes.status}`);
        }
        console.log(`[PASSED] Checkout on expired order rejected with 400.`);

        // ----------------------------------------------------
        // SUMMARY
        // ----------------------------------------------------
        console.log(`\n======================================================`);
        console.log(`[SUCCESS] ALL CHECKOUT & IDEMPOTENCY CHECKS PASSED 100%!`);
        console.log(`1. Missing X-Idempotency-Key is strictly rejected (400).`);
        console.log(`2. Normal checkout atomically completes order & records audit trail.`);
        console.log(`3. Replaying the same key returns cached response without duplicate DB writes.`);
        console.log(`4. Double-spending concurrency attack (5 parallel requests) strictly blocked (409).`);
        console.log(`5. Ownership authorization check prevents checkout hijacking (403).`);
        console.log(`6. Expired orders are prevented from checkout (400).`);
        console.log(`======================================================\n`);
    } catch (error) {
        console.error(`\n[FATAL ERROR IN CHECKOUT TEST]:`, error.message);
        process.exit(1);
    } finally {
        console.log(`[CLEANUP] Cleaning up test data...`);
        try {
            if (eventId) {
                await prismaClient.event.delete({ where: { id: eventId } }).catch(() => {});
            }
            if (organizerId) {
                await prismaClient.user.delete({ where: { id: organizerId } }).catch(() => {});
            }
            if (buyer1Id) {
                await prismaClient.user.delete({ where: { id: buyer1Id } }).catch(() => {});
            }
            if (buyer2Id) {
                await prismaClient.user.delete({ where: { id: buyer2Id } }).catch(() => {});
            }
            console.log(`[CLEANUP] Done.`);
        } catch (e) {
            console.warn(`[CLEANUP WARNING]:`, e.message);
        }
        await prismaClient.$disconnect();
    }
};

runCheckoutTest();
