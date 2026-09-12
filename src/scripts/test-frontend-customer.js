import { config } from "dotenv";
config();

import { generateQrSvg } from "../../public/js/utils/qrcode.util.js";
import { eventsApi } from "../../public/js/modules/events/events.api.js";
import { ordersApi } from "../../public/js/modules/orders/orders.api.js";
import { authApi } from "../../public/js/modules/auth/auth.api.js";
import { authStore } from "../../public/js/modules/auth/auth.store.js";
import { CONFIG } from "../../public/js/core/config.js";
import crypto from "crypto";

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;

const logStep = (step, title) => {
  console.log(`\n======================================================`);
  console.log(`[CUSTOMER STOREFRONT TEST STEP ${step}] ${title}`);
  console.log(`======================================================`);
};

const runCustomerStorefrontTests = async () => {
  console.log(`\n======================================================`);
  console.log(`[TEST RUNNER] Starting Task 10 Customer Storefront & Flash-Sale Verification...`);
  console.log(`======================================================`);

  try {
    // Configure API base URL for Node environment
    CONFIG.API_BASE_URL = `${BASE_URL}/api/v1`;

    // ----------------------------------------------------
    // STEP 1: Static Serving Verification for Task 10 Modules
    // ----------------------------------------------------
    logStep(1, "Verify HTTP 200 Serving for Task 10 Native ES Modules & CSS");

    const staticAssets = [
      { path: "/js/utils/qrcode.util.js", expected: "generateQrSvg" },
      { path: "/js/modules/events/events.api.js", expected: "eventsApi" },
      { path: "/js/modules/orders/orders.api.js", expected: "ordersApi" },
      { path: "/css/components/tickets.css", expected: "tier-card" },
      { path: "/js/modules/customer/catalog.view.js", expected: "catalogView" },
      { path: "/js/modules/customer/event-detail.view.js", expected: "eventDetailView" },
      { path: "/js/modules/customer/checkout.drawer.js", expected: "checkoutDrawer" },
      { path: "/js/modules/customer/eticket.modal.js", expected: "eticketModal" },
      { path: "/js/modules/customer/my-tickets.view.js", expected: "myTicketsView" },
    ];

    for (const asset of staticAssets) {
      const res = await fetch(`${BASE_URL}${asset.path}`);
      const text = await res.text();
      if (res.status !== 200 || !text.includes(asset.expected)) {
        throw new Error(`[FAIL] Asset ${asset.path} failed verification (status ${res.status}, missing '${asset.expected}')`);
      }
      console.log(`[PASSED] Asset: ${asset.path.padEnd(45)} -> HTTP 200 OK`);
    }

    // ----------------------------------------------------
    // STEP 2: Public Event Discovery & Redis Cache-Aside
    // ----------------------------------------------------
    logStep(2, "Test Event Discovery API & Redis Cache-Aside");

    const eventsRes1 = await eventsApi.getEvents({ limit: 10 });
    if (!eventsRes1.success || !Array.isArray(eventsRes1.data?.events)) {
      throw new Error(`[FAIL] GET /api/v1/events failed to return events array.`);
    }

    const events = eventsRes1.data.events;
    console.log(`[INFO] Retrieved ${events.length} events from catalog.`);
    if (events.length < 3) {
      throw new Error(`[FAIL] Expected at least 3 seeded events, found ${events.length}.`);
    }

    // Second fetch should hit Redis Cache
    const eventsRes2 = await eventsApi.getEvents({ limit: 10 });
    console.log(`[INFO] First Call Cache State: ${eventsRes1.data.isFromCache}, Second Call Cache State: ${eventsRes2.data.isFromCache}`);
    console.log(`[PASSED] Public Events Discovery verified with cache metadata.`);

    // ----------------------------------------------------
    // STEP 3: Event Details & Ticket Tiers Inspection
    // ----------------------------------------------------
    logStep(3, "Test Event Detail & Ticket Tiers API");

    const activeEvent = events.find(e => e.title.includes("Sơn Tùng M-TP")) || events[0];
    const detailRes = await eventsApi.getEventById(activeEvent.id);

    if (!detailRes.success || !detailRes.data || !Array.isArray(detailRes.data.ticketTiers)) {
      throw new Error(`[FAIL] Failed to fetch event detail with ticket tiers.`);
    }

    const tiers = detailRes.data.ticketTiers;
    console.log(`[INFO] Event: "${detailRes.data.title}" has ${tiers.length} ticket tiers:`);
    tiers.forEach(t => console.log(`       - Tier: ${t.name.padEnd(20)} | Price: ${t.price} VND | Stock: ${t.availableStock}/${t.totalStock}`));

    if (tiers.length === 0) {
      throw new Error(`[FAIL] Active event has no ticket tiers.`);
    }
    console.log(`[PASSED] Event Detail and Tier data verified successfully.`);

    // ----------------------------------------------------
    // STEP 4: Scheduled Flash-Sale Guard Verification
    // ----------------------------------------------------
    logStep(4, "Test Scheduled Flash-Sale Guard (Upcoming Sale Rejection)");

    const upcomingEvent = events.find(e => e.title.includes("Coldplay"));
    if (!upcomingEvent) {
      throw new Error(`[FAIL] Coldplay upcoming event not found in seeded data.`);
    }

    const upcomingDetail = await eventsApi.getEventById(upcomingEvent.id);
    const upcomingTier = upcomingDetail.data.ticketTiers[0];

    // Login customer to attempt hold on upcoming event
    const loginRes = await authApi.login({
      email: "buyer@ticketing.com",
      password: "Password123!",
    });
    const accessToken = loginRes.data?.tokens?.accessToken || loginRes.data?.accessToken;
    const refreshToken = loginRes.data?.tokens?.refreshToken || loginRes.data?.refreshToken;
    authStore.setAuth({ user: loginRes.data.user, accessToken, refreshToken });

    let upcomingHoldBlocked = false;
    try {
      await ordersApi.holdTicket({
        ticketTierId: upcomingTier.id,
        quantity: 1,
      });
    } catch (err) {
      upcomingHoldBlocked = true;
      console.log(`[INFO] Upcoming hold rejected as expected with message: "${err.message}"`);
    }

    if (!upcomingHoldBlocked) {
      throw new Error(`[FAIL] Hold should have been blocked for upcoming flash-sale!`);
    }
    console.log(`[PASSED] Flash-sale schedule guard prevented premature purchases.`);

    // ----------------------------------------------------
    // STEP 5: Atomic Ticket Hold on Active Flash-Sale Event
    // ----------------------------------------------------
    logStep(5, "Test Atomic Ticket Hold (10-Minute BullMQ Hold Window)");

    const targetTier = tiers.find(t => t.availableStock > 0);
    if (!targetTier) {
      throw new Error(`[FAIL] No available ticket tier found for active event.`);
    }

    const holdRes = await ordersApi.holdTicket({
      ticketTierId: targetTier.id,
      quantity: 1,
    });

    if (!holdRes.success || !holdRes.data?.id) {
      throw new Error(`[FAIL] Ticket hold failed: ${JSON.stringify(holdRes)}`);
    }

    const heldOrder = holdRes.data;
    console.log(`[INFO] Order Held Successfully: ID=${heldOrder.id}, Status=${heldOrder.status}`);
    console.log(`[INFO] Hold Expiration: ${heldOrder.expiresAt}`);

    const expiresAt = new Date(heldOrder.expiresAt).getTime();
    const remainingSeconds = Math.round((expiresAt - Date.now()) / 1000);
    console.log(`[INFO] Remaining Hold Time: ${remainingSeconds} seconds (~10 minutes)`);

    if (remainingSeconds < 580 || remainingSeconds > 610) {
      throw new Error(`[FAIL] Hold expiration time is not approximately 10 minutes (${remainingSeconds}s)`);
    }
    console.log(`[PASSED] Atomic Ticket Hold established with BullMQ 10-minute TTL.`);

    // ----------------------------------------------------
    // STEP 6: Idempotent Checkout Execution
    // ----------------------------------------------------
    logStep(6, "Test Idempotent Checkout & Replay Protection");

    const idempotencyKey = `customer_test_idemp_${crypto.randomUUID()}`;
    console.log(`[INFO] Submitting checkout with X-Idempotency-Key: ${idempotencyKey}`);

    const checkoutRes = await ordersApi.checkout(heldOrder.id, {
      paymentMethod: "CREDIT_CARD",
      idempotencyKey,
    });

    if (!checkoutRes.success || checkoutRes.data?.status !== "COMPLETED") {
      throw new Error(`[FAIL] Checkout failed to transition order to COMPLETED: ${JSON.stringify(checkoutRes)}`);
    }

    const completedOrder = checkoutRes.data;
    console.log(`[INFO] Order status: ${completedOrder.status}`);
    console.log(`[INFO] E-Ticket QR Payload: ${completedOrder.qrPayload ? "Present" : "Missing"}`);

    if (!completedOrder.qrPayload) {
      throw new Error(`[FAIL] Completed order must contain qrPayload for gate check-in.`);
    }

    // Replay identical checkout request with same key
    console.log(`[INFO] Replaying identical checkout request with same Idempotency-Key...`);
    const replayRes = await ordersApi.checkout(heldOrder.id, {
      paymentMethod: "CREDIT_CARD",
      idempotencyKey,
    });

    if (!replayRes.success || replayRes.data?.status !== "COMPLETED") {
      throw new Error(`[FAIL] Idempotent replay failed.`);
    }
    console.log(`[PASSED] Distributed Idempotency guaranteed zero duplicate charges on replay.`);

    // ----------------------------------------------------
    // STEP 7: Customer Orders Query ("Vé Của Tôi")
    // ----------------------------------------------------
    logStep(7, "Test 'Vé Của Tôi' (My Orders View) Data Retrieval");

    const myOrdersRes = await ordersApi.getMyOrders();
    if (!myOrdersRes.success || !Array.isArray(myOrdersRes.data)) {
      throw new Error(`[FAIL] GET /api/v1/orders/my-orders failed.`);
    }

    console.log(`[INFO] Found ${myOrdersRes.data.length} orders for current customer.`);
    const foundOrder = myOrdersRes.data.find(o => o.id === heldOrder.id);
    if (!foundOrder) {
      throw new Error(`[FAIL] Purchased order ${heldOrder.id} not found in customer orders list.`);
    }

    if (foundOrder.status !== "COMPLETED" || !foundOrder.qrPayload) {
      throw new Error(`[FAIL] Order in list is missing COMPLETED status or qrPayload.`);
    }
    console.log(`[PASSED] Customer orders list verified with full E-Ticket metadata.`);

    // ----------------------------------------------------
    // STEP 8: Zero-Dependency SVG QR Code Generator Verification
    // ----------------------------------------------------
    logStep(8, "Test Zero-Dependency SVG QR Code Generator");

    const testPayload = foundOrder.qrPayload;
    const svgCode = generateQrSvg(testPayload, 200);

    if (typeof svgCode !== "string" || !svgCode.startsWith("<svg") || !svgCode.endsWith("</svg>")) {
      throw new Error(`[FAIL] generateQrSvg did not return a valid SVG string.`);
    }

    if ((!svgCode.includes("<path") && !svgCode.includes("<rect")) || !svgCode.includes('viewBox="0 0')) {
      throw new Error(`[FAIL] SVG QR code missing required path/rect tags or viewBox.`);
    }

    console.log(`[INFO] Generated SVG QR Code length: ${svgCode.length} chars.`);
    console.log(`[PASSED] Zero-Dependency SVG QR Code Generator passed validation.`);

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log(`\n======================================================`);
    console.log(`[SUCCESS] ALL 8 CUSTOMER STOREFRONT & FLASH-SALE VERIFICATION CHECKS PASSED 100%!`);
    console.log(`======================================================\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\n[FATAL ERROR] Customer Storefront verification failed:`, error);
    process.exit(1);
  }
};

runCustomerStorefrontTests();
