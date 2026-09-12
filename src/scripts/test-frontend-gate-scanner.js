import { config } from "dotenv";
config();

import { authApi } from "../../public/js/modules/auth/auth.api.js";
import { authStore } from "../../public/js/modules/auth/auth.store.js";
import { ordersApi } from "../../public/js/modules/orders/orders.api.js";
import { eventsApi } from "../../public/js/modules/events/events.api.js";
import { organizerApi } from "../../public/js/modules/organizer/organizer.api.js";
import { CONFIG } from "../../public/js/core/config.js";
import { prismaClient } from "../config/db.js";

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;

const logStep = (step, title) => {
  console.log(`\n======================================================`);
  console.log(`[GATE SCANNER TEST STEP ${step}] ${title}`);
  console.log(`======================================================`);
};

const runGateScannerTests = async () => {
  console.log(`\n======================================================`);
  console.log(`[TEST RUNNER] Starting Task 11B Gate Check-in Scanner & Anti-Passback Verification...`);
  console.log(`======================================================`);

  try {
    CONFIG.API_BASE_URL = `${BASE_URL}/api/v1`;

    // ----------------------------------------------------
    // STEP 1: Static Asset Serving Verification
    // ----------------------------------------------------
    logStep(1, "Verify HTTP 200 Serving for Task 11B Native ES Modules & CSS");

    const staticAssets = [
      { path: "/css/components/scanner.css", expected: "scanner-alarm-card" },
      { path: "/js/modules/organizer/gate-scanner.view.js", expected: "GateScannerView" },
    ];

    for (const asset of staticAssets) {
      const res = await fetch(`${BASE_URL}${asset.path}`);
      const text = await res.text();
      if (res.status !== 200 || !text.includes(asset.expected)) {
        throw new Error(`[FAIL] Asset ${asset.path} failed verification (status ${res.status}, missing '${asset.expected}')`);
      }
      console.log(`[PASSED] Asset: ${asset.path.padEnd(48)} -> HTTP 200 OK`);
    }

    // ----------------------------------------------------
    // STEP 2: Authenticate Organizer and Buyer
    // ----------------------------------------------------
    logStep(2, "Test Organizer & Buyer Account Setup");

    // Login Organizer
    const orgLogin = await authApi.login({
      email: "organizer@ticketing.com",
      password: "Password123!",
    });
    const orgToken = orgLogin.data?.tokens?.accessToken || orgLogin.data?.accessToken;
    const orgRefreshToken = orgLogin.data?.tokens?.refreshToken || orgLogin.data?.refreshToken;
    const orgUser = orgLogin.data.user;
    const orgId = orgUser.id;

    authStore.setAuth({ user: orgUser, accessToken: orgToken, refreshToken: orgRefreshToken });
    console.log(`[INFO] Organizer authenticated: ${orgUser.email} (ID: ${orgId})`);

    // Fetch an event owned by this organizer with active ticket tiers
    const myEventsRes = await organizerApi.getMyEvents();
    const myEvents = Array.isArray(myEventsRes.data) ? myEventsRes.data : (myEventsRes.data?.events || []);
    let targetEvent = myEvents.find(e => e.status === "PUBLISHED" && e.ticketTiers && e.ticketTiers.length > 0);

    if (!targetEvent) {
      // Create a dedicated event for scanner testing if none available
      const now = new Date();
      const newEvent = await organizerApi.createEvent({
        title: `Gate Scanner Test Concert ${Date.now()}`,
        description: "Test concert for gate check-in & anti-passback validation",
        venue: "Sân Vận Động Quốc Gia Mỹ Đình",
        startTime: new Date(now.getTime() + 86400000).toISOString(),
        endTime: new Date(now.getTime() + 90000000).toISOString(),
        saleStartTime: new Date(now.getTime() - 60000).toISOString(),
        saleEndTime: new Date(now.getTime() + 86400000).toISOString(),
      });
      targetEvent = newEvent.data;
      const newTier = await organizerApi.createTicketTier(targetEvent.id, {
        name: "Standard Gate Tier",
        price: 500000,
        totalStock: 100,
      });
      targetEvent.ticketTiers = [newTier.data];
    }

    const testTier = targetEvent.ticketTiers[0];
    console.log(`[INFO] Testing with Event: "${targetEvent.title}"`);
    console.log(`       Tier: "${testTier.name}" (ID: ${testTier.id})`);
    console.log(`[PASSED] Test event and tier verified.`);

    // ----------------------------------------------------
    // STEP 3: Customer Purchases an E-Ticket (Hold -> Checkout)
    // ----------------------------------------------------
    logStep(3, "Customer Purchases an E-Ticket (Creates COMPLETED Order with QR Payload)");

    // Switch session to Buyer
    const buyerLogin = await authApi.login({
      email: "buyer@ticketing.com",
      password: "Password123!",
    });
    const buyerToken = buyerLogin.data?.tokens?.accessToken || buyerLogin.data?.accessToken;
    const buyerRefreshToken = buyerLogin.data?.tokens?.refreshToken || buyerLogin.data?.refreshToken;
    const buyerUser = buyerLogin.data.user;

    authStore.setAuth({ user: buyerUser, accessToken: buyerToken, refreshToken: buyerRefreshToken });
    console.log(`[INFO] Buyer authenticated: ${buyerUser.email}`);

    // Hold Ticket as Buyer
    const holdRes = await ordersApi.holdTicket({
      ticketTierId: testTier.id,
      quantity: 1,
    });
    const heldOrder = holdRes.data?.order || holdRes.data;
    console.log(`[INFO] Order Held: ID=${heldOrder.id}, Status=${heldOrder.status}`);

    // Checkout Order as Buyer
    const checkoutRes = await ordersApi.checkout(heldOrder.id, {
      paymentMethod: "CREDIT_CARD",
      idempotencyKey: `scanner_test_${Date.now()}`,
    });
    const completedOrder = checkoutRes.data?.order || checkoutRes.data;
    console.log(`[INFO] Order Completed: ID=${completedOrder.id}, Status=${completedOrder.status}`);

    if (completedOrder.status !== "COMPLETED") {
      throw new Error(`[FAIL] Expected COMPLETED order status, got: ${completedOrder.status}`);
    }
    console.log(`[PASSED] Customer purchased valid E-Ticket successfully.`);

    // ----------------------------------------------------
    // STEP 4: Valid Check-in at Gate (Organizer Checks-in Customer)
    // ----------------------------------------------------
    logStep(4, "Test Valid Gate Check-in (200 OK -> Status: CHECKED_IN & Audit Log)");

    // Switch back to Organizer credentials
    authStore.setAuth({ user: orgUser, accessToken: orgToken, refreshToken: orgRefreshToken });

    const checkInUrl = `${BASE_URL}/api/v1/orders/${completedOrder.id}/check-in`;
    const checkInRes = await fetch(checkInUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${orgToken}`,
      },
    });

    const checkInData = await checkInRes.json();
    if (checkInRes.status !== 200 || !checkInData.success) {
      throw new Error(`[FAIL] Check-in failed with HTTP ${checkInRes.status}: ${JSON.stringify(checkInData)}`);
    }

    const checkedInOrder = checkInData.data;
    if (checkedInOrder.status !== "CHECKED_IN") {
      throw new Error(`[FAIL] Expected CHECKED_IN order status, got: ${checkedInOrder.status}`);
    }

    // Verify DB Audit Log creation
    const auditLog = await prismaClient.auditLog.findFirst({
      where: {
        orderId: completedOrder.id,
        action: "TICKET_CHECKED_IN",
      },
    });

    if (!auditLog) {
      throw new Error(`[FAIL] Missing AuditLog for TICKET_CHECKED_IN on order ${completedOrder.id}`);
    }

    console.log(`[INFO] Order ID: ${checkedInOrder.id}`);
    console.log(`[INFO] Attendee: ${checkedInOrder.user?.name || checkedInOrder.user?.email}`);
    console.log(`[INFO] New Status: ${checkedInOrder.status}`);
    console.log(`[INFO] Audit Log ID: ${auditLog.id} (Action: ${auditLog.action})`);
    console.log(`[PASSED] First check-in verified with full audit trail.`);

    // ----------------------------------------------------
    // STEP 5: Anti-Passback Defense: Re-check-in Same Ticket
    // ----------------------------------------------------
    logStep(5, "Test Anti-Passback Defense (Replay Check-in -> 409 Conflict)");

    const recheckRes = await fetch(checkInUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${orgToken}`,
      },
    });

    const recheckData = await recheckRes.json();
    if (recheckRes.status !== 409) {
      throw new Error(`[FAIL] Anti-Passback failed! Expected HTTP 409 Conflict, got ${recheckRes.status}: ${JSON.stringify(recheckData)}`);
    }

    console.log(`[INFO] Re-check-in rejected as expected with HTTP 409 Conflict:`);
    console.log(`       Message: "${recheckData.message}"`);
    console.log(`[PASSED] Anti-Passback defense blocked duplicate ticket entry successfully.`);

    // ----------------------------------------------------
    // STEP 6: Cross-Organizer Defense (Unauthorized Event Check-in)
    // ----------------------------------------------------
    logStep(6, "Test Cross-Organizer Security Guard (403 Forbidden)");

    // Buyer attempts to call check-in endpoint (Role Guard)
    const unauthorizedRes = await fetch(checkInUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`,
      },
    });

    const unauthData = await unauthorizedRes.json();
    if (unauthorizedRes.status !== 403) {
      throw new Error(`[FAIL] Expected HTTP 403 Forbidden for non-organizer check-in, got ${unauthorizedRes.status}`);
    }

    console.log(`[INFO] Non-organizer check-in rejected as expected with HTTP 403:`);
    console.log(`       Message: "${unauthData.message}"`);
    console.log(`[PASSED] Role-based check-in authorization verified.`);

    // ----------------------------------------------------
    // STEP 7: Unpaid Ticket Check-in Defense (Status: PENDING)
    // ----------------------------------------------------
    logStep(7, "Test Unpaid Ticket Defense (Attempt Check-in on PENDING Order -> 400 Bad Request)");

    // Customer holds another ticket without checking out
    authStore.setAuth({ user: buyerUser, accessToken: buyerToken, refreshToken: buyerRefreshToken });
    const holdOnlyRes = await ordersApi.holdTicket({
      ticketTierId: testTier.id,
      quantity: 1,
    });
    const pendingOrder = holdOnlyRes.data?.order || holdOnlyRes.data;

    // Switch to organizer and attempt to check-in the PENDING order
    const unpaidCheckInRes = await fetch(`${BASE_URL}/api/v1/orders/${pendingOrder.id}/check-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${orgToken}`,
      },
    });

    const unpaidData = await unpaidCheckInRes.json();
    if (unpaidCheckInRes.status !== 400) {
      throw new Error(`[FAIL] Expected HTTP 400 Bad Request for unpaid check-in, got ${unpaidCheckInRes.status}`);
    }

    console.log(`[INFO] Unpaid ticket rejected as expected with HTTP 400 Bad Request:`);
    console.log(`       Message: "${unpaidData.message}"`);
    console.log(`[PASSED] Unpaid order check-in guard verified.`);

    console.log(`\n======================================================`);
    console.log(`[SUCCESS] ALL TASK 11B GATE SCANNER & ANTI-PASSBACK CHECKS PASSED 100%!`);
    console.log(`1. Static assets (scanner.css, gate-scanner.view.js) serving verified.`);
    console.log(`2. Organizer and Buyer authentication & event setup verified.`);
    console.log(`3. Valid check-in changes status to CHECKED_IN and creates AuditLog.`);
    console.log(`4. Anti-Passback defense blocks duplicate check-in with HTTP 409 Conflict.`);
    console.log(`5. Non-organizer check-in blocked with HTTP 403 Forbidden.`);
    console.log(`6. Unpaid (PENDING) check-in blocked with HTTP 400 Bad Request.`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error(`\n[ERROR] Gate Scanner Verification failed:`, err.message);
    process.exit(1);
  } finally {
    await prismaClient.$disconnect();
    process.exit(0);
  }
};

runGateScannerTests();
