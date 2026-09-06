import { config } from "dotenv";
config();

import crypto from "crypto";
import { prismaClient } from "../config/db.js";
import { generateAccessToken } from "../utils/jwt.util.js";

const BASE_URL = `http://localhost:${process.env.PORT || 5001}/api/v1`;

const logStep = (step, title) => {
    console.log(`\n======================================================`);
    console.log(`[CONCURRENCY TEST STEP ${step}] ${title}`);
    console.log(`======================================================`);
};

const runConcurrencyTest = async () => {
    const timestamp = Date.now();
    let organizerId = "";
    let eventId = "";
    let tierId = "";
    const createdUserIds = [];

    try {
        // ----------------------------------------------------
        // STEP 1: Setup Test Data (1 Event, 1 Tier with 10 Tickets)
        // ----------------------------------------------------
        logStep(1, "Setup Test Data: 1 Tier with exactly 10 Tickets");

        // 1.1 Create Organizer
        const organizer = await prismaClient.user.create({
            data: {
                email: `organizer_concurrency_${timestamp}@example.com`,
                username: `organizer_concurrency_${timestamp}`,
                password: "hashedpassword123",
                name: "Flash Sale Organizer",
                role: "ORGANIZER",
            },
        });
        organizerId = organizer.id;
        createdUserIds.push(organizerId);

        // 1.2 Create Event
        const event = await prismaClient.event.create({
            data: {
                title: `Flash-Sale Concert ${timestamp}`,
                description: "High concurrency testing event with limited tickets.",
                startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 28 * 60 * 60 * 1000),
                organizerId,
            },
        });
        eventId = event.id;

        // 1.3 Create Ticket Tier with exactly 10 tickets
        const tier = await prismaClient.ticketTier.create({
            data: {
                eventId,
                name: "Super Limited VIP",
                price: 500.0,
                totalStock: 10,
                availableStock: 10,
            },
        });
        tierId = tier.id;

        console.log(`[SETUP] Event created: "${event.title}" (ID: ${eventId})`);
        console.log(`[SETUP] Ticket Tier: "${tier.name}" | Available Stock: ${tier.availableStock}`);

        // ----------------------------------------------------
        // STEP 2: Pre-create 100 Distinct Users & Tokens
        // ----------------------------------------------------
        logStep(2, "Generate 100 Concurrent Buyers & Access Tokens");

        const TOTAL_BUYERS = 100;
        const buyerRecords = Array.from({ length: TOTAL_BUYERS }, (_, i) => {
            const userId = crypto.randomUUID();
            createdUserIds.push(userId);
            return {
                id: userId,
                email: `buyer_${timestamp}_${i}@example.com`,
                username: `buyer_${timestamp}_${i}`,
                password: "hashedpassword123",
                name: `Concurrent Buyer ${i + 1}`,
                role: "USER",
            };
        });

        // Batch insert 100 users directly into PostgreSQL
        await prismaClient.user.createMany({ data: buyerRecords });

        // Generate valid signed JWT Access Tokens for each user
        const buyerTokens = buyerRecords.map((u) =>
            generateAccessToken({ id: u.id, email: u.email, role: u.role })
        );

        console.log(`[SETUP] Created ${TOTAL_BUYERS} distinct buyers in PostgreSQL.`);

        // ----------------------------------------------------
        // STEP 3: Launch 100 Concurrent Requests via Promise.all
        // ----------------------------------------------------
        logStep(3, "FLASH-SALE ATTACK: 100 Simultaneous Hold Requests for 10 Tickets");

        console.log(`[RACE] Launching ${TOTAL_BUYERS} requests simultaneously...`);
        const startTime = Date.now();

        const requestPromises = buyerTokens.map((token) =>
            fetch(`${BASE_URL}/tickets/hold`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ticketTierId: tierId,
                    quantity: 1,
                }),
            }).then(async (res) => {
                const body = await res.json().catch(() => ({}));
                return {
                    status: res.status,
                    body,
                };
            })
        );

        const responses = await Promise.all(requestPromises);
        const duration = Date.now() - startTime;

        console.log(`[RACE] All ${TOTAL_BUYERS} requests completed in ${duration}ms!`);

        // ----------------------------------------------------
        // STEP 4: Analyze Response Status Codes
        // ----------------------------------------------------
        logStep(4, "Analyze HTTP Responses & Verify No Overselling");

        let successCount = 0;
        let conflictCount = 0;
        let otherCount = 0;
        const errorDetails = [];

        for (const res of responses) {
            if (res.status === 201) {
                successCount++;
            } else if (res.status === 409) {
                conflictCount++;
            } else {
                otherCount++;
                errorDetails.push(res);
            }
        }

        console.log(`[RESULTS] Status 201 Created (Success): ${successCount}`);
        console.log(`[RESULTS] Status 409 Conflict (Sold Out): ${conflictCount}`);
        if (otherCount > 0) {
            console.error(`[RESULTS] Other Statuses: ${otherCount}`, errorDetails.slice(0, 3));
        }

        // Assert exactly 10 succeeded and 90 failed
        if (successCount !== 10) {
            throw new Error(`[FAIL] Expected exactly 10 successes, but got ${successCount}! Overselling or bug detected.`);
        }

        if (conflictCount !== 90) {
            throw new Error(`[FAIL] Expected exactly 90 conflicts (409), but got ${conflictCount}!`);
        }

        console.log(`[PASSED] Exactly 10 requests succeeded (201) and 90 were rejected (409)!`);

        // ----------------------------------------------------
        // STEP 5: Database Consistency & Integrity Assertions
        // ----------------------------------------------------
        logStep(5, "Database State Consistency Verification");

        // 5.1 Check TicketTier stock in PostgreSQL
        const updatedTier = await prismaClient.ticketTier.findUnique({
            where: { id: tierId },
        });

        console.log(`[DB CHECK] TicketTier available_stock: ${updatedTier.availableStock}`);
        if (updatedTier.availableStock !== 0) {
            throw new Error(`[FAIL] Expected available_stock to be 0, but found ${updatedTier.availableStock}!`);
        }

        // 5.2 Count actual orders created in PostgreSQL
        const createdOrdersCount = await prismaClient.order.count({
            where: { ticketTierId: tierId, status: "PENDING" },
        });

        console.log(`[DB CHECK] Total PENDING orders created in DB: ${createdOrdersCount}`);
        if (createdOrdersCount !== 10) {
            throw new Error(`[FAIL] Expected exactly 10 orders in DB, but found ${createdOrdersCount}!`);
        }

        console.log(`[PASSED] Database integrity 100% verified. available_stock == 0, exactly 10 orders created.`);

        // ----------------------------------------------------
        // SUMMARY
        // ----------------------------------------------------
        console.log(`\n======================================================`);
        console.log(`[SUCCESS] ALL CONCURRENCY CHECKS PASSED 100%!`);
        console.log(`Pessimistic Locking (SELECT ... FOR UPDATE) successfully`);
        console.log(`prevented Race Condition & Overselling under high contention.`);
        console.log(`======================================================\n`);
    } catch (error) {
        console.error(`\n[FATAL ERROR IN CONCURRENCY TEST]:`, error.message);
        process.exit(1);
    } finally {
        // Cleanup test data
        console.log(`[CLEANUP] Cleaning up test data...`);
        try {
            if (eventId) {
                await prismaClient.event.delete({ where: { id: eventId } }).catch(() => { });
            }
            if (createdUserIds.length > 0) {
                await prismaClient.user.deleteMany({
                    where: { id: { in: createdUserIds } },
                }).catch(() => { });
            }
            console.log(`[CLEANUP] Done.`);
        } catch (e) {
            console.warn(`[CLEANUP WARNING]:`, e.message);
        }
        await prismaClient.$disconnect();
    }
};

runConcurrencyTest();
