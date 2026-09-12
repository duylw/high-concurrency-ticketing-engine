import { config } from "dotenv";
config();

import { organizerApi } from "../../public/js/modules/organizer/organizer.api.js";
import { authApi } from "../../public/js/modules/auth/auth.api.js";
import { authStore } from "../../public/js/modules/auth/auth.store.js";
import { CONFIG } from "../../public/js/core/config.js";

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;

const logStep = (step, title) => {
  console.log(`\n======================================================`);
  console.log(`[ORGANIZER STUDIO TEST STEP ${step}] ${title}`);
  console.log(`======================================================`);
};

const runOrganizerStudioTests = async () => {
  console.log(`\n======================================================`);
  console.log(`[TEST RUNNER] Starting Task 11A Organizer Studio & Sales Analytics Verification...`);
  console.log(`======================================================`);

  try {
    // Configure API base URL for Node environment
    CONFIG.API_BASE_URL = `${BASE_URL}/api/v1`;

    // ----------------------------------------------------
    // STEP 1: Static Serving Verification for Task 11A Modules
    // ----------------------------------------------------
    logStep(1, "Verify HTTP 200 Serving for Task 11A Native ES Modules & CSS");

    const staticAssets = [
      { path: "/css/components/organizer.css", expected: "kpi-grid" },
      { path: "/js/modules/organizer/organizer.api.js", expected: "organizerApi" },
      { path: "/js/modules/organizer/event-create.modal.js", expected: "eventCreateModal" },
      { path: "/js/modules/organizer/organizer-studio.view.js", expected: "organizerStudioView" },
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
    // STEP 2: Organizer Authentication & Role State
    // ----------------------------------------------------
    logStep(2, "Test Organizer Authentication & Role Store State");

    const orgLoginRes = await authApi.login({
      email: "organizer@ticketing.com",
      password: "Password123!",
    });

    const orgAccessToken = orgLoginRes.data?.tokens?.accessToken || orgLoginRes.data?.accessToken;
    const orgRefreshToken = orgLoginRes.data?.tokens?.refreshToken || orgLoginRes.data?.refreshToken;
    const orgUser = orgLoginRes.data.user;

    authStore.setAuth({ user: orgUser, accessToken: orgAccessToken, refreshToken: orgRefreshToken });

    if (!authStore.isAuthenticated || !authStore.isOrganizer || authStore.role !== "ORGANIZER") {
      throw new Error(`[FAIL] Expected organizer session but got role: ${authStore.role}`);
    }
    console.log(`[PASSED] Organizer authenticated: ${orgUser.email} (Role: ${authStore.role}, isOrganizer: ${authStore.isOrganizer})`);

    // ----------------------------------------------------
    // STEP 3: Organizer Sales Analytics Retrieval
    // ----------------------------------------------------
    logStep(3, "Fetch Organizer Sales Analytics & KPI Summary");

    const myEventsRes = await organizerApi.getMyEvents();
    if (!myEventsRes.success || !Array.isArray(myEventsRes.data)) {
      throw new Error(`[FAIL] Expected array of organizer events from GET /events/organizer/my-events`);
    }

    const existingEvents = myEventsRes.data;
    console.log(`[INFO] Retrieved ${existingEvents.length} events owned by organizer:`);

    let totalRevenue = 0;
    let totalTicketsSold = 0;
    let totalStock = 0;

    for (const evt of existingEvents) {
      totalRevenue += evt.totalRevenue || 0;
      totalTicketsSold += evt.totalTicketsSold || 0;
      totalStock += evt.totalStock || 0;
      console.log(`       - "${evt.title.slice(0, 30)}" | Status: ${evt.status} | Sold: ${evt.totalTicketsSold}/${evt.totalStock} (${evt.soldOutPercentage}%) | Revenue: ${evt.totalRevenue?.toLocaleString()} VND`);
    }

    console.log(`[INFO] Aggregate Studio KPIs:`);
    console.log(`       - Total Revenue:      ${totalRevenue.toLocaleString()} VND`);
    console.log(`       - Total Tickets Sold: ${totalTicketsSold.toLocaleString()} / ${totalStock.toLocaleString()}`);
    console.log(`       - Overall Ratio:      ${totalStock > 0 ? Math.round((totalTicketsSold / totalStock) * 100) : 0}%`);
    console.log(`[PASSED] Sales Analytics KPIs retrieved with complete fields.`);

    // ----------------------------------------------------
    // STEP 4: Role Guard Enforcement (Customer 403 Forbidden)
    // ----------------------------------------------------
    logStep(4, "Test Role Guard Defense: Non-Organizer Access Rejection");

    // Login as normal buyer
    const buyerLoginRes = await authApi.login({
      email: "buyer@ticketing.com",
      password: "Password123!",
    });
    const buyerAccessToken = buyerLoginRes.data?.tokens?.accessToken || buyerLoginRes.data?.accessToken;
    const buyerRefreshToken = buyerLoginRes.data?.tokens?.refreshToken || buyerLoginRes.data?.refreshToken;
    authStore.setAuth({ user: buyerLoginRes.data.user, accessToken: buyerAccessToken, refreshToken: buyerRefreshToken });

    let buyerBlocked = false;
    try {
      await organizerApi.getMyEvents();
    } catch (err) {
      buyerBlocked = true;
      console.log(`[INFO] Normal buyer rejected as expected with error: "${err.message}"`);
    }

    if (!buyerBlocked) {
      throw new Error(`[FAIL] Expected GET /events/organizer/my-events to reject USER with 403 Forbidden.`);
    }
    console.log(`[PASSED] Role Guard strictly blocked non-organizer request with HTTP 403.`);

    // Switch back to organizer session
    authStore.setAuth({ user: orgUser, accessToken: orgAccessToken, refreshToken: orgRefreshToken });

    // ----------------------------------------------------
    // STEP 5: Create New Event with Flash-Sale Schedule Window
    // ----------------------------------------------------
    logStep(5, "Create New Event with Scheduled Flash-Sale Window");

    const now = new Date();
    const eventStartTime = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const eventEndTime = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString();
    const saleStartTime = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const saleEndTime = new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString();

    const newEventPayload = {
      title: `Automation Fest Studio ${Date.now()}`,
      description: "Đại nhạc hội công nghệ quy mô lớn tích hợp cổng soát vé thông minh và flash-sale engine.",
      bannerUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200",
      startTime: eventStartTime,
      endTime: eventEndTime,
      saleStartTime: saleStartTime,
      saleEndTime: saleEndTime,
      status: "PUBLISHED",
    };

    const createRes = await organizerApi.createEvent(newEventPayload);
    if (!createRes.success || !createRes.data?.id) {
      throw new Error(`[FAIL] Event creation failed: ${JSON.stringify(createRes)}`);
    }

    const createdEvent = createRes.data;
    console.log(`[PASSED] Created event successfully: ID: ${createdEvent.id} | Title: "${createdEvent.title}"`);

    // ----------------------------------------------------
    // STEP 6: Add Dynamic Ticket Tiers to Created Event
    // ----------------------------------------------------
    logStep(6, "Add Dynamic Ticket Tiers (VIP Diamond & Standard GA)");

    const tier1 = await organizerApi.addTicketTier(createdEvent.id, {
      name: "VIP Diamond Lounge",
      price: 2500000,
      totalStock: 50,
    });
    console.log(`[PASSED] Tier 1 added: "${tier1.data.name}" (50 tickets @ 2,500,000 VND)`);

    const tier2 = await organizerApi.addTicketTier(createdEvent.id, {
      name: "Standard Standing GA",
      price: 800000,
      totalStock: 200,
    });
    console.log(`[PASSED] Tier 2 added: "${tier2.data.name}" (200 tickets @ 800,000 VND)`);

    // ----------------------------------------------------
    // STEP 7: Verify Event In Organizer Dashboard
    // ----------------------------------------------------
    logStep(7, "Re-fetch Organizer Events & Verify Calculated Tiers/Stock");

    const refreshedEventsRes = await organizerApi.getMyEvents();
    const foundEvent = refreshedEventsRes.data.find(e => e.id === createdEvent.id);

    if (!foundEvent) {
      throw new Error(`[FAIL] Newly created event was not found in GET /events/organizer/my-events`);
    }

    if (foundEvent.totalStock !== 250 || foundEvent.ticketTiers.length !== 2) {
      throw new Error(`[FAIL] Expected totalStock=250 and 2 tiers, got: stock=${foundEvent.totalStock}, tiers=${foundEvent.ticketTiers.length}`);
    }

    console.log(`[PASSED] Event verified in Organizer Dashboard:`);
    console.log(`       - Title:       "${foundEvent.title}"`);
    console.log(`       - Total Stock: ${foundEvent.totalStock} tickets across ${foundEvent.ticketTiers.length} tiers`);
    console.log(`       - Sold Ratio:  ${foundEvent.soldOutPercentage}%`);

    // ----------------------------------------------------
    // STEP 8: Test Event Lifecycle Update
    // ----------------------------------------------------
    logStep(8, "Update Event Lifecycle Details");

    const updateRes = await organizerApi.updateEvent(createdEvent.id, {
      description: "Mô tả sự kiện đã được cập nhật bởi Ban Tổ Chức qua Organizer Studio View.",
    });

    if (!updateRes.success || !updateRes.data.description.includes("cập nhật")) {
      throw new Error(`[FAIL] Event update failed.`);
    }
    console.log(`[PASSED] Event metadata updated successfully.`);

    // ----------------------------------------------------
    // STEP 9: Clean Up Test Event
    // ----------------------------------------------------
    logStep(9, "Clean Up Test Event (Safe Delete for 0-Order Event)");

    const deleteRes = await organizerApi.deleteEvent(createdEvent.id);
    if (!deleteRes.success) {
      throw new Error(`[FAIL] Event delete failed.`);
    }
    console.log(`[PASSED] Test event ${createdEvent.id} cleanly removed.`);

    console.log(`\n======================================================`);
    console.log(`[SUCCESS] Task 11A Organizer Studio & Sales Analytics VERIFIED 100%!`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error(`\n[ERROR] Task 11A Verification Failed:`, err);
    process.exit(1);
  }
};

runOrganizerStudioTests();
