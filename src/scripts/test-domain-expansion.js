import { config } from "dotenv";
config();

import crypto from "crypto";
import { prismaClient } from "../config/db.js";
import { generateAccessToken } from "../utils/jwt.util.js";

const BASE_URL = `http://localhost:${process.env.PORT || 5001}/api/v1`;

const logStep = (step, title) => {
    console.log(`\n======================================================`);
    console.log(`[DOMAIN TEST STEP ${step}] ${title}`);
    console.log(`======================================================`);
};

const runDomainExpansionTests = async () => {
    const timestamp = Date.now();
    let organizer1Id = "";
    let organizer1Token = "";
    let organizer2Id = "";
    let organizer2Token = "";
    let buyerId = "";
    let buyerToken = "";
    let eventAId = "";
    let tierAId = "";
    let eventBId = "";
    let order1Id = "";
    let order2Id = "";

    try {
        // ----------------------------------------------------
        // STEP 0: Setup Actors (Organizer 1, Organizer 2, Buyer)
        // ----------------------------------------------------
        logStep(0, "Setup Test Actors (Organizer 1, Organizer 2, Customer)");

        const organizer1 = await prismaClient.user.create({
            data: {
                email: `org1_domain_${timestamp}@example.com`,
                username: `org1_domain_${timestamp}`,
                password: "hashedpassword123",
                name: "Domain Lead Organizer",
                role: "ORGANIZER",
            },
        });
        organizer1Id = organizer1.id;
        organizer1Token = generateAccessToken({ id: organizer1.id, role: organizer1.role });

        const organizer2 = await prismaClient.user.create({
            data: {
                email: `org2_domain_${timestamp}@example.com`,
                username: `org2_domain_${timestamp}`,
                password: "hashedpassword123",
                name: "Competitor Organizer",
                role: "ORGANIZER",
            },
        });
        organizer2Id = organizer2.id;
        organizer2Token = generateAccessToken({ id: organizer2.id, role: organizer2.role });

        const buyer = await prismaClient.user.create({
            data: {
                email: `buyer_domain_${timestamp}@example.com`,
                username: `buyer_domain_${timestamp}`,
                password: "hashedpassword123",
                name: "Domain Test Buyer",
                role: "USER",
            },
        });
        buyerId = buyer.id;
        buyerToken = generateAccessToken({ id: buyer.id, role: buyer.role });

        console.log(`[PASSED] Created Organizer 1 (${organizer1Id}), Organizer 2 (${organizer2Id}), and Buyer (${buyerId})`);

        // ----------------------------------------------------
        // STEP 1: Sale Window Enforcement - Future Sale Window Blocked (400)
        // ----------------------------------------------------
        logStep(1, "Create Event with Future saleStartTime & verify holdTicket blocked (400)");

        const futureStartTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours in future
        const futureEndTime = new Date(Date.now() + 10 * 60 * 60 * 1000);

        const eventA = await prismaClient.event.create({
            data: {
                title: `Rock Festival ${timestamp}`,
                description: "Event with scheduled flash-sale window",
                startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 52 * 60 * 60 * 1000),
                saleStartTime: futureStartTime,
                saleEndTime: futureEndTime,
                status: "PUBLISHED",
                organizerId: organizer1Id,
            },
        });
        eventAId = eventA.id;

        const tierA = await prismaClient.ticketTier.create({
            data: {
                eventId: eventAId,
                name: "Rock VIP Zone",
                price: 150.0,
                totalStock: 10,
                availableStock: 10,
            },
        });
        tierAId = tierA.id;

        const holdFutureRes = await fetch(`${BASE_URL}/tickets/hold`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${buyerToken}`,
            },
            body: JSON.stringify({
                ticketTierId: tierAId,
                quantity: 1,
            }),
        });

        const holdFutureData = await holdFutureRes.json();
        console.log(`[INFO] Hold response for future sale: HTTP ${holdFutureRes.status} - ${holdFutureData.message}`);

        if (holdFutureRes.status !== 400 || !holdFutureData.message.includes("not started yet")) {
            throw new Error(`[FAIL] Expected 400 with 'not started yet', got HTTP ${holdFutureRes.status}: ${JSON.stringify(holdFutureData)}`);
        }
        console.log(`[PASSED] Hold strictly rejected before saleStartTime with HTTP 400.`);

        // ----------------------------------------------------
        // STEP 2: Sale Window Enforcement - Past Sale End Window Blocked (400)
        // ----------------------------------------------------
        logStep(2, "Update Event with Past saleEndTime & verify holdTicket blocked (400)");

        await prismaClient.event.update({
            where: { id: eventAId },
            data: {
                saleStartTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
                saleEndTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // Closed 1h ago
            },
        });

        const holdEndedRes = await fetch(`${BASE_URL}/tickets/hold`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${buyerToken}`,
            },
            body: JSON.stringify({
                ticketTierId: tierAId,
                quantity: 1,
            }),
        });

        const holdEndedData = await holdEndedRes.json();
        console.log(`[INFO] Hold response for closed sale: HTTP ${holdEndedRes.status} - ${holdEndedData.message}`);

        if (holdEndedRes.status !== 400 || !holdEndedData.message.includes("closed")) {
            throw new Error(`[FAIL] Expected 400 with 'closed', got HTTP ${holdEndedRes.status}: ${JSON.stringify(holdEndedData)}`);
        }
        console.log(`[PASSED] Hold strictly rejected after saleEndTime with HTTP 400.`);

        // ----------------------------------------------------
        // STEP 3: Active Sale Window - Hold & Checkout Success (201)
        // ----------------------------------------------------
        logStep(3, "Activate Sale Window -> Hold 2 Tickets & Complete Checkout");

        await prismaClient.event.update({
            where: { id: eventAId },
            data: {
                saleStartTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // Opened 1h ago
                saleEndTime: new Date(Date.now() + 4 * 60 * 60 * 1000),  // Closes in 4h
            },
        });

        const holdActiveRes = await fetch(`${BASE_URL}/tickets/hold`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${buyerToken}`,
            },
            body: JSON.stringify({
                ticketTierId: tierAId,
                quantity: 2,
            }),
        });

        const holdActiveData = await holdActiveRes.json();
        if (holdActiveRes.status !== 201) {
            throw new Error(`[FAIL] Expected 201 Created on active sale window, got HTTP ${holdActiveRes.status}: ${JSON.stringify(holdActiveData)}`);
        }
        order1Id = holdActiveData.data.id;
        console.log(`[PASSED] Hold ticket succeeded on active window. Order ID: ${order1Id}`);

        // Checkout order1
        const checkoutRes = await fetch(`${BASE_URL}/orders/${order1Id}/checkout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${buyerToken}`,
                "X-Idempotency-Key": `idemp-domain-${timestamp}`,
            },
        });
        const checkoutData = await checkoutRes.json();
        if (checkoutRes.status !== 201 || checkoutData.data.status !== "COMPLETED") {
            throw new Error(`[FAIL] Expected 201 COMPLETED on checkout, got HTTP ${checkoutRes.status}: ${JSON.stringify(checkoutData)}`);
        }
        console.log(`[PASSED] Order ${order1Id} successfully checked out and completed.`);

        // ----------------------------------------------------
        // STEP 4: Customer Query API - GET /api/v1/orders/my-orders
        // ----------------------------------------------------
        logStep(4, "Customer Orders API (GET /api/v1/orders/my-orders) & QR Code Payload");

        const myOrdersRes = await fetch(`${BASE_URL}/orders/my-orders`, {
            headers: {
                Authorization: `Bearer ${buyerToken}`,
            },
        });
        const myOrdersData = await myOrdersRes.json();

        if (myOrdersRes.status !== 200 || !Array.isArray(myOrdersData.data)) {
            throw new Error(`[FAIL] Expected 200 array for my-orders, got HTTP ${myOrdersRes.status}`);
        }

        const foundOrder = myOrdersData.data.find((o) => o.id === order1Id);
        if (!foundOrder) {
            throw new Error(`[FAIL] Placed order ${order1Id} not found in my-orders response.`);
        }

        if (!foundOrder.qrPayload) {
            throw new Error(`[FAIL] Order missing 'qrPayload' field.`);
        }

        const parsedQR = JSON.parse(foundOrder.qrPayload);
        if (parsedQR.orderId !== order1Id || parsedQR.status !== "COMPLETED") {
            throw new Error(`[FAIL] Invalid QR payload content: ${foundOrder.qrPayload}`);
        }

        console.log(`[PASSED] my-orders returned successfully with valid QR payload:`);
        console.log(`         QR Payload: ${foundOrder.qrPayload}`);

        // ----------------------------------------------------
        // STEP 5: Organizer Analytics API - GET /api/v1/events/organizer/my-events
        // ----------------------------------------------------
        logStep(5, "Organizer Analytics API (GET /api/v1/events/organizer/my-events)");

        const organizerEventsRes = await fetch(`${BASE_URL}/events/organizer/my-events`, {
            headers: {
                Authorization: `Bearer ${organizer1Token}`,
            },
        });
        const organizerEventsData = await organizerEventsRes.json();

        if (organizerEventsRes.status !== 200 || !Array.isArray(organizerEventsData.data)) {
            throw new Error(`[FAIL] Expected 200 array for organizer events, got HTTP ${organizerEventsRes.status}`);
        }

        const eventStats = organizerEventsData.data.find((e) => e.id === eventAId);
        if (!eventStats || !eventStats.stats) {
            throw new Error(`[FAIL] Event ${eventAId} or its stats not found in organizer events.`);
        }

        console.log(`[INFO] Event A Analytics:`, JSON.stringify(eventStats.stats, null, 2));

        // Check accurate metrics
        // Total tickets sold: 2, Total stock: 10, Total revenue: 2 * 150 = 300, soldOutPercentage: 20%
        if (eventStats.stats.totalTicketsSold !== 2) {
            throw new Error(`[FAIL] Expected totalTicketsSold = 2, got ${eventStats.stats.totalTicketsSold}`);
        }
        if (eventStats.stats.totalRevenue !== 300) {
            throw new Error(`[FAIL] Expected totalRevenue = 300, got ${eventStats.stats.totalRevenue}`);
        }
        if (eventStats.stats.totalStock !== 10) {
            throw new Error(`[FAIL] Expected totalStock = 10, got ${eventStats.stats.totalStock}`);
        }
        if (eventStats.stats.soldOutPercentage !== 20) {
            throw new Error(`[FAIL] Expected soldOutPercentage = 20, got ${eventStats.stats.soldOutPercentage}`);
        }
        console.log(`[PASSED] Organizer aggregate metrics verified 100% accurate.`);

        // ----------------------------------------------------
        // STEP 6: Gate Check-in - Permission, State Machine & Replay Defense
        // ----------------------------------------------------
        logStep(6, "Gate Check-in API (POST /api/v1/orders/:id/check-in) Verification");

        // 6.1 Unauthorized Organizer Check-in (Organizer 2 trying to check-in Event A)
        const unauthCheckInRes = await fetch(`${BASE_URL}/orders/${order1Id}/check-in`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${organizer2Token}`,
            },
        });
        console.log(`[INFO] Unauthorized check-in attempt: HTTP ${unauthCheckInRes.status}`);
        if (unauthCheckInRes.status !== 403) {
            throw new Error(`[FAIL] Expected 403 Forbidden for non-owner organizer check-in, got ${unauthCheckInRes.status}`);
        }
        console.log(`[PASSED] Cross-organizer check-in strictly rejected with 403 Forbidden.`);

        // 6.2 Valid Check-in by Organizer 1
        const validCheckInRes = await fetch(`${BASE_URL}/orders/${order1Id}/check-in`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${organizer1Token}`,
            },
        });
        const validCheckInData = await validCheckInRes.json();
        if (validCheckInRes.status !== 200 || validCheckInData.data.status !== "CHECKED_IN") {
            throw new Error(`[FAIL] Expected 200 CHECKED_IN, got HTTP ${validCheckInRes.status}: ${JSON.stringify(validCheckInData)}`);
        }
        console.log(`[PASSED] Ticket checked in successfully. Order status updated to CHECKED_IN.`);

        // Verify Audit Log recorded in DB
        const auditLog = await prismaClient.auditLog.findFirst({
            where: { orderId: order1Id, action: "TICKET_CHECKED_IN" },
        });
        if (!auditLog) {
            throw new Error(`[FAIL] TICKET_CHECKED_IN audit log was not recorded in DB.`);
        }
        console.log(`[PASSED] Audit trail entry verified: ${auditLog.details}`);

        // 6.3 Anti-Replay Defense: Duplicate Check-in with the same ticket
        const duplicateCheckInRes = await fetch(`${BASE_URL}/orders/${order1Id}/check-in`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${organizer1Token}`,
            },
        });
        const duplicateCheckInData = await duplicateCheckInRes.json();
        console.log(`[INFO] Duplicate check-in response: HTTP ${duplicateCheckInRes.status} - ${duplicateCheckInData.message}`);
        if (duplicateCheckInRes.status !== 409 || !duplicateCheckInData.message.includes("ALREADY")) {
            throw new Error(`[FAIL] Expected 409 Conflict with 'ALREADY', got HTTP ${duplicateCheckInRes.status}: ${JSON.stringify(duplicateCheckInData)}`);
        }
        console.log(`[PASSED] Duplicate check-in strictly blocked with HTTP 409 Conflict.`);

        // 6.4 Check-in on Unpaid/Pending order rejected with 400
        const holdPendingRes = await fetch(`${BASE_URL}/tickets/hold`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${buyerToken}`,
            },
            body: JSON.stringify({
                ticketTierId: tierAId,
                quantity: 1,
            }),
        });
        const holdPendingData = await holdPendingRes.json();
        order2Id = holdPendingData.data.id;

        const checkInPendingRes = await fetch(`${BASE_URL}/orders/${order2Id}/check-in`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${organizer1Token}`,
            },
        });
        console.log(`[INFO] Check-in on PENDING order: HTTP ${checkInPendingRes.status}`);
        if (checkInPendingRes.status !== 400) {
            throw new Error(`[FAIL] Expected 400 Bad Request when checking in unpaid ticket, got ${checkInPendingRes.status}`);
        }
        console.log(`[PASSED] Check-in on unpaid/PENDING ticket strictly rejected with HTTP 400.`);

        // ----------------------------------------------------
        // STEP 7: Event Deletion & Soft-Cancellation
        // ----------------------------------------------------
        logStep(7, "Event Deletion & Soft-Cancellation (DELETE /api/v1/events/:id)");

        // 7.1 Delete Event A (has orders -> must soft-cancel to CANCELLED)
        const deleteEventARes = await fetch(`${BASE_URL}/events/${eventAId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${organizer1Token}`,
            },
        });
        const deleteEventAData = await deleteEventARes.json();
        console.log(`[INFO] Delete event with orders response: HTTP ${deleteEventARes.status} - ${deleteEventAData.message}`);

        if (deleteEventARes.status !== 200 || deleteEventAData.data.status !== "CANCELLED") {
            throw new Error(`[FAIL] Expected 200 CANCELLED for event with orders, got HTTP ${deleteEventARes.status}`);
        }

        const dbEventA = await prismaClient.event.findUnique({ where: { id: eventAId } });
        if (!dbEventA || dbEventA.status !== "CANCELLED") {
            throw new Error(`[FAIL] Event in DB was not updated to CANCELLED status.`);
        }
        console.log(`[PASSED] Event with orders was safely soft-cancelled to CANCELLED status.`);

        // Verify holding ticket on CANCELLED event is rejected with 409
        const holdCancelledRes = await fetch(`${BASE_URL}/tickets/hold`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${buyerToken}`,
            },
            body: JSON.stringify({
                ticketTierId: tierAId,
                quantity: 1,
            }),
        });
        console.log(`[INFO] Hold on CANCELLED event: HTTP ${holdCancelledRes.status}`);
        if (holdCancelledRes.status !== 409) {
            throw new Error(`[FAIL] Expected 409 Conflict when holding ticket on CANCELLED event, got ${holdCancelledRes.status}`);
        }
        console.log(`[PASSED] Hold ticket on CANCELLED event strictly rejected with HTTP 409 Conflict.`);

        // 7.2 Hard Delete Event B (no orders -> permanently deleted)
        const eventB = await prismaClient.event.create({
            data: {
                title: `Disposable Concert ${timestamp}`,
                description: "Empty event for hard delete test",
                startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 52 * 60 * 60 * 1000),
                organizerId: organizer1Id,
            },
        });
        eventBId = eventB.id;

        const deleteEventBRes = await fetch(`${BASE_URL}/events/${eventBId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${organizer1Token}`,
            },
        });
        if (deleteEventBRes.status !== 200) {
            throw new Error(`[FAIL] Expected 200 for deleting empty event, got HTTP ${deleteEventBRes.status}`);
        }

        const dbEventB = await prismaClient.event.findUnique({ where: { id: eventBId } });
        if (dbEventB !== null) {
            throw new Error(`[FAIL] Empty event was not permanently deleted from DB.`);
        }
        eventBId = "";
        console.log(`[PASSED] Empty event without orders was permanently deleted.`);

        // ----------------------------------------------------
        // SUMMARY
        // ----------------------------------------------------
        console.log(`\n======================================================`);
        console.log(`[SUCCESS] ALL TASK-08 DOMAIN EXPANSION TESTS PASSED 100%!`);
        console.log(`1. Future saleStartTime strictly blocks ticket hold (400 Bad Request).`);
        console.log(`2. Expired saleEndTime strictly blocks ticket hold (400 Bad Request).`);
        console.log(`3. Active sale window allows holding and checking out tickets (201 Created).`);
        console.log(`4. Customer can retrieve purchased orders with complete QR payload (200 OK).`);
        console.log(`5. Organizer retrieves aggregate sales metrics with 100% mathematical precision.`);
        console.log(`6. Gate check-in succeeds with 200 OK and records audit trail.`);
        console.log(`7. Duplicate check-in attempt is strictly blocked with 409 Conflict.`);
        console.log(`8. Cross-organizer check-in authorization is guarded with 403 Forbidden.`);
        console.log(`9. Events with orders are protected from hard-delete and soft-cancelled.`);
        console.log(`10. Empty events are cleanly hard-deleted.`);
        console.log(`======================================================\n`);
    } catch (error) {
        console.error(`\n[FATAL ERROR IN DOMAIN EXPANSION TEST]:`, error.message);
        process.exit(1);
    } finally {
        console.log(`[CLEANUP] Cleaning up test data...`);
        try {
            if (order1Id || order2Id) {
                await prismaClient.auditLog.deleteMany({
                    where: { orderId: { in: [order1Id, order2Id].filter(Boolean) } },
                }).catch(() => {});
                await prismaClient.order.deleteMany({
                    where: { id: { in: [order1Id, order2Id].filter(Boolean) } },
                }).catch(() => {});
            }
            if (tierAId) {
                await prismaClient.ticketTier.deleteMany({ where: { eventId: eventAId } }).catch(() => {});
            }
            if (eventAId) {
                await prismaClient.event.delete({ where: { id: eventAId } }).catch(() => {});
            }
            if (eventBId) {
                await prismaClient.event.delete({ where: { id: eventBId } }).catch(() => {});
            }
            if (organizer1Id) {
                await prismaClient.user.delete({ where: { id: organizer1Id } }).catch(() => {});
            }
            if (organizer2Id) {
                await prismaClient.user.delete({ where: { id: organizer2Id } }).catch(() => {});
            }
            if (buyerId) {
                await prismaClient.user.delete({ where: { id: buyerId } }).catch(() => {});
            }
            console.log(`[CLEANUP] Done.`);
        } catch (e) {
            console.warn(`[CLEANUP WARNING]:`, e.message);
        }
        await prismaClient.$disconnect();
    }
};

runDomainExpansionTests();
