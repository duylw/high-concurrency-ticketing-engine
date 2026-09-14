import { config } from "dotenv";
config();

import { prismaClient } from "../config/db.js";

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;
const API_URL = `${BASE_URL}/api/v1`;

const logStep = (step, title) => {
  console.log(`\n======================================================`);
  console.log(`[MULTI-TICKET TEST STEP ${step}] ${title}`);
  console.log(`======================================================`);
};

const runMultiTicketTests = async () => {
  console.log(`\n======================================================`);
  console.log(`[TEST RUNNER] Starting Task 11D Multi-Ticket Wallet UI & Individual QR Viewer Tests...`);
  console.log(`======================================================`);

  try {
    // ----------------------------------------------------
    // STEP 1: Verify Static Asset Serving
    // ----------------------------------------------------
    logStep(1, "Verify HTTP 200 Serving for Task 11D Modules & CSS");

    const staticAssets = [
      { path: "/css/components/tickets.css", expected: "ticket-tabs-nav" },
      { path: "/css/components/tickets.css", expected: "order-itemized-tickets" },
      { path: "/js/modules/customer/eticket.modal.js", expected: "EticketModal" },
      { path: "/js/modules/customer/eticket.modal.js", expected: "ticket-tab-btn" },
      { path: "/js/modules/customer/my-tickets.view.js", expected: "order-itemized-tickets" },
      { path: "/js/modules/customer/my-tickets.view.js", expected: "btn-view-single-ticket" },
      { path: "/js/modules/organizer/gate-scanner.view.js", expected: "ticketCodeRegex" },
    ];

    for (const asset of staticAssets) {
      const res = await fetch(`${BASE_URL}${asset.path}`);
      const text = await res.text();
      if (res.status !== 200 || !text.includes(asset.expected)) {
        throw new Error(`[FAIL] Asset ${asset.path} failed check (status ${res.status}, missing '${asset.expected}')`);
      }
      console.log(`[PASSED] Asset: ${asset.path.padEnd(46)} contains '${asset.expected}' -> HTTP 200 OK`);
    }

    // ----------------------------------------------------
    // STEP 2: Authenticate Organizer and Buyer
    // ----------------------------------------------------
    logStep(2, "Authenticate Organizer and Buyer");

    const orgLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "organizer@ticketing.com", password: "Password123!" }),
    });
    const orgLogin = await orgLoginRes.json();
    if (!orgLoginRes.ok) throw new Error(`Organizer login failed: ${JSON.stringify(orgLogin)}`);
    const orgToken = orgLogin.data?.tokens?.accessToken || orgLogin.data?.accessToken;
    const orgUser = orgLogin.data.user;
    console.log(`[INFO] Organizer authenticated: ${orgUser.email} (ID: ${orgUser.id})`);

    const buyerLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "buyer@ticketing.com", password: "Password123!" }),
    });
    const buyerLogin = await buyerLoginRes.json();
    if (!buyerLoginRes.ok) throw new Error(`Buyer login failed: ${JSON.stringify(buyerLogin)}`);
    const buyerToken = buyerLogin.data?.tokens?.accessToken || buyerLogin.data?.accessToken;
    const buyerUser = buyerLogin.data.user;
    console.log(`[INFO] Buyer authenticated: ${buyerUser.email} (ID: ${buyerUser.id})`);

    // ----------------------------------------------------
    // STEP 3: Setup Test Event and Ticket Tier
    // ----------------------------------------------------
    logStep(3, "Find or Create Test Event & Ticket Tier with Stock");

    const now = new Date();
    let testTier = await prismaClient.ticketTier.findFirst({
      where: {
        totalStock: { gt: 10 },
        availableStock: { gte: 2 },
        event: {
          organizerId: orgUser.id,
          status: "PUBLISHED",
          saleStartTime: { lte: now },
          saleEndTime: { gt: now },
        },
      },
      include: { event: true },
    });

    if (!testTier) {
      const now = new Date();
      const newEvent = await prismaClient.event.create({
        data: {
          title: `Multi-Ticket UI Concert ${Date.now()}`,
          description: "Testing multi-ticket wallet UI, carousel tabs, and gate check-in",
          venue: "National Convention Center",
          startTime: new Date(now.getTime() + 86400000),
          endTime: new Date(now.getTime() + 90000000),
          saleStartTime: new Date(now.getTime() - 60000),
          saleEndTime: new Date(now.getTime() + 86400000),
          status: "PUBLISHED",
          organizerId: orgUser.id,
          ticketTiers: {
            create: {
              name: "Platinum Dual Pass",
              price: 1200000,
              totalStock: 50,
            },
          },
        },
        include: { ticketTiers: true },
      });
      testTier = { ...newEvent.ticketTiers[0], event: newEvent };
    }

    console.log(`[INFO] Test Tier: "${testTier.name}" (ID: ${testTier.id})`);
    console.log(`       Event: "${testTier.event.title}"`);
    console.log(`[PASSED] Test event and tier verified.`);

    // ----------------------------------------------------
    // STEP 4: Buyer Purchases Order with 2 Tickets (Quantity = 2)
    // ----------------------------------------------------
    logStep(4, "Buyer Holds and Checks Out Order with 2 Tickets");

    const holdRes = await fetch(`${API_URL}/orders/hold`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ ticketTierId: testTier.id, quantity: 2 }),
    });
    const holdData = await holdRes.json();
    if (!holdRes.ok) throw new Error(`Hold failed: ${JSON.stringify(holdData)}`);
    const heldOrder = holdData.data?.order || holdData.data;

    const checkoutRes = await fetch(`${API_URL}/orders/${heldOrder.id}/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`,
        "X-Idempotency-Key": `multiticket_test_${Date.now()}`,
      },
    });
    const checkoutData = await checkoutRes.json();
    if (!checkoutRes.ok) throw new Error(`Checkout failed: ${JSON.stringify(checkoutData)}`);
    const completedOrder = checkoutData.data?.order || checkoutData.data;

    console.log(`[INFO] Completed Order ID: ${completedOrder.id}, Status: ${completedOrder.status}`);
    console.log(`[PASSED] Purchased 2 tickets successfully.`);

    // ----------------------------------------------------
    // STEP 5: Verify Customer My-Orders API Returns Itemized Tickets
    // ----------------------------------------------------
    logStep(5, "Verify Customer Wallet API Returns Itemized Tickets");

    const myOrdersRes = await fetch(`${API_URL}/orders/my-orders`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const myOrdersData = await myOrdersRes.json();
    if (!myOrdersRes.ok) throw new Error(`Fetch my-orders failed: ${JSON.stringify(myOrdersData)}`);

    const orderInWallet = myOrdersData.data.find((o) => o.id === completedOrder.id);
    if (!orderInWallet) throw new Error(`[FAIL] Order ${completedOrder.id} not found in my-orders`);

    const tickets = orderInWallet.tickets || [];
    console.log(`[INFO] Number of itemized tickets in order: ${tickets.length}`);
    if (tickets.length !== 2) {
      throw new Error(`[FAIL] Expected 2 itemized tickets in order, got ${tickets.length}`);
    }

    const [t1, t2] = tickets;
    console.log(`[INFO] Ticket 1: Code=${t1.ticketCode}, Status=${t1.status}`);
    console.log(`[INFO] Ticket 2: Code=${t2.ticketCode}, Status=${t2.status}`);

    if (!t1.ticketCode || !t2.ticketCode || t1.ticketCode === t2.ticketCode) {
      throw new Error(`[FAIL] Individual tickets must have unique ticketCodes`);
    }
    console.log(`[PASSED] Customer Wallet API returned 2 distinct tickets.`);

    // ----------------------------------------------------
    // STEP 6: Gate Check-in for Ticket 1 (Friend A arrives first)
    // ----------------------------------------------------
    logStep(6, "Friend A Check-in with Ticket 1 Code via Gate Scanner API");

    const checkIn1Res = await fetch(`${API_URL}/orders/${t1.ticketCode}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    const checkIn1Data = await checkIn1Res.json();
    if (!checkIn1Res.ok) throw new Error(`Check-in Ticket 1 failed: ${JSON.stringify(checkIn1Data)}`);

    console.log(`[INFO] Check-in 1 Status: ${checkIn1Res.status}`);
    console.log(`[INFO] Ticket 1 Code: ${checkIn1Data.data.ticketCode}, Status: ${checkIn1Data.data.status}`);
    console.log(`[INFO] Parent Order Status: ${checkIn1Data.data.order?.status}`);

    if (checkIn1Data.data.order?.status !== "PARTIALLY_CHECKED_IN") {
      throw new Error(`[FAIL] Expected parent order status 'PARTIALLY_CHECKED_IN', got '${checkIn1Data.data.order?.status}'`);
    }
    if (checkIn1Data.data.order?.remainingTickets !== 1) {
      throw new Error(`[FAIL] Expected 1 remaining ticket, got ${checkIn1Data.data.order?.remainingTickets}`);
    }
    console.log(`[PASSED] Friend A checked in Ticket 1. Order transitioned to PARTIALLY_CHECKED_IN.`);

    // ----------------------------------------------------
    // STEP 7: Anti-Passback Defense on Ticket 1
    // ----------------------------------------------------
    logStep(7, "Anti-Passback Defense: Rescan Ticket 1 (Expect 409 Conflict)");

    const recheck1Res = await fetch(`${API_URL}/orders/${t1.ticketCode}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    const recheck1Data = await recheck1Res.json();

    if (recheck1Res.status !== 409) {
      throw new Error(`[FAIL] Expected 409 Conflict on duplicate check-in, got ${recheck1Res.status}`);
    }
    console.log(`[INFO] Anti-Passback Alert: "${recheck1Data.message}"`);
    console.log(`[PASSED] Anti-Passback defense blocked duplicate scan of Ticket 1 with HTTP 409.`);

    // ----------------------------------------------------
    // STEP 8: Gate Check-in for Ticket 2 (Friend B arrives later)
    // ----------------------------------------------------
    logStep(8, "Friend B Check-in with Ticket 2 UUID via Gate Scanner API");

    const checkIn2Res = await fetch(`${API_URL}/orders/${t2.id}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    const checkIn2Data = await checkIn2Res.json();
    if (!checkIn2Res.ok) throw new Error(`Check-in Ticket 2 failed: ${JSON.stringify(checkIn2Data)}`);

    console.log(`[INFO] Check-in 2 Status: ${checkIn2Res.status}`);
    console.log(`[INFO] Ticket 2 Code: ${checkIn2Data.data.ticketCode}, Status: ${checkIn2Data.data.status}`);
    console.log(`[INFO] Parent Order Final Status: ${checkIn2Data.data.order?.status}`);

    if (checkIn2Data.data.order?.status !== "CHECKED_IN") {
      throw new Error(`[FAIL] Expected parent order status 'CHECKED_IN', got '${checkIn2Data.data.order?.status}'`);
    }
    if (checkIn2Data.data.order?.remainingTickets !== 0) {
      throw new Error(`[FAIL] Expected 0 remaining tickets, got ${checkIn2Data.data.order?.remainingTickets}`);
    }
    console.log(`[PASSED] Friend B checked in Ticket 2. Order transitioned to 100% CHECKED_IN.`);

    // ----------------------------------------------------
    // STEP 9: Anti-Passback Defense on Ticket 2
    // ----------------------------------------------------
    logStep(9, "Anti-Passback Defense: Rescan Ticket 2 (Expect 409 Conflict)");

    const recheck2Res = await fetch(`${API_URL}/orders/${t2.id}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${orgToken}` },
    });

    if (recheck2Res.status !== 409) {
      throw new Error(`[FAIL] Expected 409 Conflict on duplicate check-in of Ticket 2, got ${recheck2Res.status}`);
    }
    console.log(`[PASSED] Anti-Passback defense blocked duplicate scan of Ticket 2 with HTTP 409.`);

    // ----------------------------------------------------
    // STEP 10: Re-verify Customer Wallet UI State after Check-in
    // ----------------------------------------------------
    logStep(10, "Re-verify Customer Wallet Reflects CHECKED_IN State");

    const finalOrdersRes = await fetch(`${API_URL}/orders/my-orders`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const finalOrdersData = await finalOrdersRes.json();
    const finalOrder = finalOrdersData.data.find((o) => o.id === completedOrder.id);

    if (finalOrder.status !== "CHECKED_IN") {
      throw new Error(`[FAIL] Final order status should be CHECKED_IN, got ${finalOrder.status}`);
    }
    const allCheckedIn = finalOrder.tickets.every((t) => t.status === "CHECKED_IN");
    if (!allCheckedIn) {
      throw new Error(`[FAIL] All tickets in order should be CHECKED_IN in customer wallet`);
    }
    console.log(`[INFO] Verified both tickets in order show status CHECKED_IN in customer wallet.`);
    console.log(`[PASSED] Customer wallet state synchronization verified.`);

    console.log(`\n======================================================`);
    console.log(`[ALL PASSED] TASK-11D MULTI-TICKET WALLET UI & GATE SCANNER TESTS COMPLETED SUCCESSFULLY!`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error(`\n[FATAL ERROR] Test failed:`, err);
    process.exit(1);
  } finally {
    await prismaClient.$disconnect();
  }
};

runMultiTicketTests();
