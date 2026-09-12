import { config } from "dotenv";
config();

import { prismaClient } from "../config/db.js";

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

const logStep = (step, title) => {
  console.log(`\n======================================================`);
  console.log(`[ITEMIZED TICKET TEST STEP ${step}] ${title}`);
  console.log(`======================================================`);
};

const runItemizedTicketTests = async () => {
  console.log(`\n======================================================`);
  console.log(`[TEST RUNNER] Starting Task 11C Itemized Ticket Model & Individual QR Check-in Tests...`);
  console.log(`======================================================`);

  try {
    // ----------------------------------------------------
    // STEP 1: Authenticate Organizer and Buyer
    // ----------------------------------------------------
    logStep(1, "Authenticate Organizer and Buyer");

    const orgLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "organizer@ticketing.com",
        password: "Password123!",
      }),
    });
    const orgLogin = await orgLoginRes.json();
    if (!orgLoginRes.ok) throw new Error(`Organizer login failed: ${JSON.stringify(orgLogin)}`);
    const orgToken = orgLogin.data?.tokens?.accessToken || orgLogin.data?.accessToken;
    const orgUser = orgLogin.data.user;
    console.log(`[INFO] Organizer authenticated: ${orgUser.email} (ID: ${orgUser.id})`);

    const buyerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "buyer@ticketing.com",
        password: "Password123!",
      }),
    });
    const buyerLogin = await buyerLoginRes.json();
    if (!buyerLoginRes.ok) throw new Error(`Buyer login failed: ${JSON.stringify(buyerLogin)}`);
    const buyerToken = buyerLogin.data?.tokens?.accessToken || buyerLogin.data?.accessToken;
    const buyerUser = buyerLogin.data.user;
    console.log(`[INFO] Buyer authenticated: ${buyerUser.email} (ID: ${buyerUser.id})`);

    // ----------------------------------------------------
    // STEP 2: Find or Create Test Event & Ticket Tier
    // ----------------------------------------------------
    logStep(2, "Find or Create Test Event & Tier for Itemized Issuance");

    let testTier = await prismaClient.ticketTier.findFirst({
      where: {
        totalStock: { gt: 10 },
        event: { organizerId: orgUser.id, status: "PUBLISHED" },
      },
      include: { event: true },
    });

    if (!testTier) {
      const now = new Date();
      const newEvent = await prismaClient.event.create({
        data: {
          title: `Itemized Concert Test ${Date.now()}`,
          description: "Testing separate ticket issuance and staggered check-in",
          venue: "My Dinh National Stadium",
          startTime: new Date(now.getTime() + 86400000),
          endTime: new Date(now.getTime() + 90000000),
          saleStartTime: new Date(now.getTime() - 60000),
          saleEndTime: new Date(now.getTime() + 86400000),
          status: "PUBLISHED",
          organizerId: orgUser.id,
          ticketTiers: {
            create: {
              name: "VIP Dual Pass Tier",
              price: 1500000,
              totalStock: 50,
            },
          },
        },
        include: { ticketTiers: true },
      });
      testTier = { ...newEvent.ticketTiers[0], event: newEvent };
    }

    console.log(`[INFO] Target Tier: "${testTier.name}" (ID: ${testTier.id})`);
    console.log(`       Event: "${testTier.event.title}" (ID: ${testTier.event.id})`);
    console.log(`[PASSED] Target event and tier verified.`);

    // ----------------------------------------------------
    // STEP 3: Buyer Holds 2 Tickets (Quantity = 2)
    // ----------------------------------------------------
    logStep(3, "Buyer Holds 2 Tickets (Quantity = 2)");

    const holdRes = await fetch(`${BASE_URL}/orders/hold`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        ticketTierId: testTier.id,
        quantity: 2,
      }),
    });
    const holdData = await holdRes.json();
    if (!holdRes.ok) throw new Error(`Hold failed: ${JSON.stringify(holdData)}`);
    const heldOrder = holdData.data?.order || holdData.data;

    console.log(`[INFO] Held Order ID: ${heldOrder.id}, Quantity: ${heldOrder.quantity}, Status: ${heldOrder.status}`);
    if (heldOrder.quantity !== 2 || heldOrder.status !== "PENDING") {
      throw new Error(`[FAIL] Held order quantity or status mismatch!`);
    }
    console.log(`[PASSED] 2 tickets held successfully in PENDING status.`);

    // ----------------------------------------------------
    // STEP 4: Buyer Checks Out Order -> Issues 2 Distinct Tickets
    // ----------------------------------------------------
    logStep(4, "Buyer Checks Out Order -> Verifying Itemized Ticket Issuance");

    const idempotencyKey = `itemized_test_${Date.now()}`;
    const checkoutRes = await fetch(`${BASE_URL}/orders/${heldOrder.id}/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
    });
    const checkoutData = await checkoutRes.json();
    if (!checkoutRes.ok) throw new Error(`Checkout failed: ${JSON.stringify(checkoutData)}`);
    const completedOrder = checkoutData.data?.order || checkoutData.data;

    console.log(`[INFO] Completed Order ID: ${completedOrder.id}, Status: ${completedOrder.status}`);
    if (completedOrder.status !== "COMPLETED") {
      throw new Error(`[FAIL] Expected order status COMPLETED, got ${completedOrder.status}`);
    }

    // Verify exactly 2 Ticket records in DB for this Order
    const dbTickets = await prismaClient.ticket.findMany({
      where: { orderId: completedOrder.id },
      orderBy: { ticketCode: "asc" },
    });

    console.log(`[INFO] Number of individual tickets created in DB: ${dbTickets.length}`);
    if (dbTickets.length !== 2) {
      throw new Error(`[FAIL] Expected exactly 2 tickets created, found ${dbTickets.length}`);
    }

    const [ticket1, ticket2] = dbTickets;
    console.log(`[INFO] Ticket 1: ID=${ticket1.id}, Code=${ticket1.ticketCode}, Status=${ticket1.status}`);
    console.log(`[INFO] Ticket 2: ID=${ticket2.id}, Code=${ticket2.ticketCode}, Status=${ticket2.status}`);

    if (ticket1.ticketCode === ticket2.ticketCode) {
      throw new Error(`[FAIL] Duplicate ticketCode detected between tickets!`);
    }
    if (ticket1.status !== "ISSUED" || ticket2.status !== "ISSUED") {
      throw new Error(`[FAIL] New tickets must have status 'ISSUED'`);
    }

    // Verify QR payload is valid JSON and contains ticket identifiers
    const qr1 = JSON.parse(ticket1.qrPayload);
    const qr2 = JSON.parse(ticket2.qrPayload);

    if (qr1.ticketCode !== ticket1.ticketCode || qr2.ticketCode !== ticket2.ticketCode) {
      throw new Error(`[FAIL] QR payload ticketCode does not match ticket record`);
    }
    if (qr1.ticketIndex !== 1 || qr2.ticketIndex !== 2) {
      throw new Error(`[FAIL] QR payload ticketIndex incorrect`);
    }
    console.log(`[PASSED] 2 distinct tickets issued with unique ticketCodes and QR payloads.`);

    // ----------------------------------------------------
    // STEP 5: Verify GET /orders/my-orders Includes Itemized Tickets
    // ----------------------------------------------------
    logStep(5, "Verify GET /orders/my-orders Populates Itemized Tickets");

    const myOrdersRes = await fetch(`${BASE_URL}/orders/my-orders`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const myOrdersData = await myOrdersRes.json();
    if (!myOrdersRes.ok) throw new Error(`Fetch my-orders failed: ${JSON.stringify(myOrdersData)}`);

    const myOrder = myOrdersData.data.find(o => o.id === completedOrder.id);
    if (!myOrder) throw new Error(`[FAIL] Order ${completedOrder.id} not found in my-orders list`);
    if (!myOrder.tickets || myOrder.tickets.length !== 2) {
      throw new Error(`[FAIL] Expected order to include 2 tickets in my-orders response`);
    }
    console.log(`[INFO] Verified order in my-orders has tickets array of length ${myOrder.tickets.length}`);
    console.log(`[PASSED] Customer wallet successfully retrieves itemized tickets.`);

    // ----------------------------------------------------
    // STEP 6: Staggered Arrival - Friend A Check-in with Ticket 1 Code
    // ----------------------------------------------------
    logStep(6, "Friend A Check-in with Ticket 1 (Using ticketCode)");

    const checkIn1Res = await fetch(`${BASE_URL}/tickets/${ticket1.ticketCode}/check-in`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${orgToken}`,
      },
    });
    const checkIn1Data = await checkIn1Res.json();
    if (!checkIn1Res.ok) throw new Error(`Ticket 1 check-in failed: ${JSON.stringify(checkIn1Data)}`);

    console.log(`[INFO] Check-in 1 Response Status: ${checkIn1Res.status}`);
    console.log(`[INFO] Checked In Ticket: ${checkIn1Data.data.ticketCode}, Status: ${checkIn1Data.data.status}`);

    // Verify Ticket 1 in DB
    const updatedTicket1 = await prismaClient.ticket.findUnique({ where: { id: ticket1.id } });
    if (updatedTicket1.status !== "CHECKED_IN" || !updatedTicket1.checkedInAt) {
      throw new Error(`[FAIL] Ticket 1 status should be CHECKED_IN with timestamp`);
    }

    // Verify Parent Order Status in DB is now PARTIALLY_CHECKED_IN
    const parentOrderStep6 = await prismaClient.order.findUnique({ where: { id: completedOrder.id } });
    console.log(`[INFO] Parent Order Status: ${parentOrderStep6.status}`);
    if (parentOrderStep6.status !== "PARTIALLY_CHECKED_IN") {
      throw new Error(`[FAIL] Expected Parent Order status 'PARTIALLY_CHECKED_IN', got '${parentOrderStep6.status}'`);
    }
    console.log(`[PASSED] Friend A checked in Ticket 1. Parent order transitioned to PARTIALLY_CHECKED_IN.`);

    // ----------------------------------------------------
    // STEP 7: Anti-Passback Defense - Rescan Ticket 1
    // ----------------------------------------------------
    logStep(7, "Anti-Passback Defense - Rescan Ticket 1 (Expect 409 Conflict)");

    const recheck1Res = await fetch(`${BASE_URL}/tickets/${ticket1.ticketCode}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    const recheck1Data = await recheck1Res.json();

    console.log(`[INFO] Rescan Status Code: ${recheck1Res.status}`);
    console.log(`[INFO] Rescan Error Message: ${recheck1Data.message}`);

    if (recheck1Res.status !== 409) {
      throw new Error(`[FAIL] Expected 409 Conflict on duplicate check-in, got ${recheck1Res.status}`);
    }
    console.log(`[PASSED] Anti-Passback defense blocked duplicate scan of Ticket 1 with 409 Conflict.`);

    // ----------------------------------------------------
    // STEP 8: Staggered Arrival - Friend B Check-in with Ticket 2 UUID
    // ----------------------------------------------------
    logStep(8, "Friend B Arrives Later - Check-in Ticket 2 (Using ticketId UUID via /orders/:id/check-in)");

    const checkIn2Res = await fetch(`${BASE_URL}/orders/${ticket2.id}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    const checkIn2Data = await checkIn2Res.json();
    if (!checkIn2Res.ok) throw new Error(`Ticket 2 check-in failed: ${JSON.stringify(checkIn2Data)}`);

    console.log(`[INFO] Check-in 2 Response Status: ${checkIn2Res.status}`);
    console.log(`[INFO] Checked In Ticket: ${checkIn2Data.data.ticketCode}, Status: ${checkIn2Data.data.status}`);

    // Verify Ticket 2 in DB
    const updatedTicket2 = await prismaClient.ticket.findUnique({ where: { id: ticket2.id } });
    if (updatedTicket2.status !== "CHECKED_IN") {
      throw new Error(`[FAIL] Ticket 2 status should be CHECKED_IN`);
    }

    // Verify Parent Order Status in DB is now CHECKED_IN (100% tickets used)
    const parentOrderStep8 = await prismaClient.order.findUnique({ where: { id: completedOrder.id } });
    console.log(`[INFO] Parent Order Final Status: ${parentOrderStep8.status}`);
    if (parentOrderStep8.status !== "CHECKED_IN") {
      throw new Error(`[FAIL] Expected Parent Order status 'CHECKED_IN', got '${parentOrderStep8.status}'`);
    }
    console.log(`[PASSED] Friend B checked in Ticket 2. Parent order transitioned to 100% CHECKED_IN.`);

    // ----------------------------------------------------
    // STEP 9: Anti-Passback Defense - Rescan Ticket 2
    // ----------------------------------------------------
    logStep(9, "Anti-Passback Defense - Rescan Ticket 2 (Expect 409 Conflict)");

    const recheck2Res = await fetch(`${BASE_URL}/tickets/${ticket2.id}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${orgToken}` },
    });

    if (recheck2Res.status !== 409) {
      throw new Error(`[FAIL] Expected 409 Conflict on duplicate check-in of Ticket 2, got ${recheck2Res.status}`);
    }
    console.log(`[PASSED] Anti-Passback defense blocked duplicate scan of Ticket 2 with 409 Conflict.`);

    // ----------------------------------------------------
    // STEP 10: Security Authorization Check
    // ----------------------------------------------------
    logStep(10, "Security Check - Buyer Attempting Gate Check-in (Expect 403 Forbidden)");

    const unauthCheckInRes = await fetch(`${BASE_URL}/tickets/${ticket1.id}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${buyerToken}` },
    });

    if (unauthCheckInRes.status !== 403) {
      throw new Error(`[FAIL] Expected 403 Forbidden for non-organizer check-in, got ${unauthCheckInRes.status}`);
    }
    console.log(`[PASSED] Security gate check-in correctly enforces RBAC 403 Forbidden for buyers.`);

    console.log(`\n======================================================`);
    console.log(`[ALL PASSED] TASK-11C ITEMIZATION & STAGGERED CHECK-IN TESTS COMPLETED SUCCESSFULLY!`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error(`\n[FATAL ERROR] Test failed:`, err);
    process.exit(1);
  } finally {
    await prismaClient.$disconnect();
  }
};

runItemizedTicketTests();
