import { config } from "dotenv";
config();

import { authApi } from "../../public/js/modules/auth/auth.api.js";
import { authStore } from "../../public/js/modules/auth/auth.store.js";
import { CONFIG } from "../../public/js/core/config.js";

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;

const logStep = (step, title) => {
  console.log(`\n======================================================`);
  console.log(`[UI CLEANUP TEST STEP ${step}] ${title}`);
  console.log(`======================================================`);
};

const runProductionUiCleanupTests = async () => {
  console.log(`\n======================================================`);
  console.log(`[TEST RUNNER] Starting Task 14 Production UI/UX Cleanup Verification...`);
  console.log(`======================================================`);

  try {
    CONFIG.API_BASE_URL = `${BASE_URL}/api/v1`;

    // ----------------------------------------------------
    // STEP 1: Inspect index.html for Complete Removal of Demo Elements
    // ----------------------------------------------------
    logStep(1, "Verify Complete Removal of Demo Elements & Features from index.html");

    const indexRes = await fetch(`${BASE_URL}/`);
    const indexHtml = await indexRes.text();

    if (indexHtml.includes("#features") || indexHtml.includes("Công Nghệ")) {
      throw new Error(`[FAIL] index.html still contains #features or 'Công Nghệ' link!`);
    }
    console.log(`[PASSED] #features and 'Công Nghệ' successfully removed from navbar.`);

    if (indexHtml.includes('href="#schedule"')) {
      throw new Error(`[FAIL] index.html still contains duplicate #schedule link in navbar!`);
    }
    console.log(`[PASSED] Duplicate #schedule link removed from navbar.`);

    if (indexHtml.includes("btn-test-toast") || indexHtml.includes("Thử Toast Notification")) {
      throw new Error(`[FAIL] index.html still contains #btn-test-toast button!`);
    }
    console.log(`[PASSED] Demo toast test button removed.`);

    if (indexHtml.includes('id="demo-modal"') || indexHtml.includes("demo-modal-title")) {
      throw new Error(`[FAIL] index.html still contains #demo-modal markup!`);
    }
    console.log(`[PASSED] Demo modal markup completely removed.`);

    if (indexHtml.includes('id="demo-cards"')) {
      throw new Error(`[FAIL] index.html still contains static #demo-cards section!`);
    }
    console.log(`[PASSED] Static demo cards section removed.`);

    // ----------------------------------------------------
    // STEP 2: Inspect auth.modal.js for Removal of Quick-Fill Buttons
    // ----------------------------------------------------
    logStep(2, "Verify Removal of Demo Quick-Fill Buttons in auth.modal.js");

    const authModalRes = await fetch(`${BASE_URL}/js/modules/auth/auth.modal.js`);
    const authModalJs = await authModalRes.text();

    if (authModalJs.includes("btn-quick-buyer") || authModalJs.includes("btn-quick-organizer")) {
      throw new Error(`[FAIL] auth.modal.js still contains quick-fill demo buttons!`);
    }
    console.log(`[PASSED] #btn-quick-buyer and #btn-quick-organizer removed from auth modal.`);

    if (authModalJs.includes("buyer@ticketing.com") || authModalJs.includes("Password123!")) {
      throw new Error(`[FAIL] auth.modal.js still contains hardcoded demo credentials!`);
    }
    console.log(`[PASSED] Hardcoded demo credentials completely removed from auth modal source.`);

    if (!authModalJs.includes('placeholder="email@example.com"')) {
      throw new Error(`[FAIL] auth.modal.js missing neutral email placeholder!`);
    }
    console.log(`[PASSED] Neutral email placeholder 'email@example.com' confirmed.`);

    // ----------------------------------------------------
    // STEP 3: Inspect catalog.view.js for Status Filter Tabs & Commercial Copy
    // ----------------------------------------------------
    logStep(3, "Verify Event Status Tabs & Commercial Copywriting in catalog.view.js");

    const catalogRes = await fetch(`${BASE_URL}/js/modules/customer/catalog.view.js`);
    const catalogJs = await catalogRes.text();

    if (!catalogJs.includes("catalog-tabs-wrap") || !catalogJs.includes("catalog-tab-btn")) {
      throw new Error(`[FAIL] catalog.view.js missing event status filter tabs (.catalog-tabs-wrap)!`);
    }
    console.log(`[PASSED] Event status filter tabs present in catalog view.`);

    if (!catalogJs.includes('data-filter="all"') || !catalogJs.includes('data-filter="live"') || !catalogJs.includes('data-filter="upcoming"')) {
      throw new Error(`[FAIL] catalog.view.js missing required filter attributes (all, live, upcoming)!`);
    }
    console.log(`[PASSED] All 3 filter attributes (all, live, upcoming) verified.`);

    // ----------------------------------------------------
    // STEP 4: Inspect app.js for Route Mapping of Schedule to Upcoming Filter
    // ----------------------------------------------------
    logStep(4, "Verify Client Route Mapping in app.js");

    const appJsRes = await fetch(`${BASE_URL}/js/app.js`);
    const appJs = await appJsRes.text();

    if (!appJs.includes("catalogView.render('upcoming')")) {
      throw new Error(`[FAIL] app.js does not route schedule to catalogView.render('upcoming')!`);
    }
    console.log(`[PASSED] #schedule route successfully mapped to catalogView.render('upcoming').`);

    // ----------------------------------------------------
    // STEP 5: Functional Authentication Check (Standard Manual Form Flow)
    // ----------------------------------------------------
    logStep(5, "Test Authentication Service with Standard Credentials");

    const loginRes = await authApi.login({
      email: "buyer@ticketing.com",
      password: "Password123!",
    });

    if (!loginRes?.success || !loginRes.data?.tokens?.accessToken) {
      throw new Error(`[FAIL] Standard login failed after UI cleanup: ${JSON.stringify(loginRes)}`);
    }

    authStore.setAuth({
      user: loginRes.data.user,
      accessToken: loginRes.data.tokens.accessToken,
      refreshToken: loginRes.data.tokens.refreshToken,
    });

    console.log(`[INFO] Authenticated user: ${authStore.user?.email} (Role: ${authStore.user?.role})`);
    console.log(`[PASSED] Authentication API functions smoothly without demo buttons.`);

    console.log(`\n======================================================`);
    console.log(`[SUCCESS] ALL TASK 14 PRODUCTION UI CLEANUP CHECKS PASSED 100%!`);
    console.log(`1. #features and duplicate #schedule removed from Navbar.`);
    console.log(`2. Static demo cards, demo toast button, and demo modal eliminated.`);
    console.log(`3. Quick-fill credentials buttons removed from Auth Modal.`);
    console.log(`4. Catalog View equipped with dynamic filter tabs (All, Live, Upcoming).`);
    console.log(`5. Route #schedule cleanly maps to Upcoming Countdown filter.`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error(`\n[ERROR] Production UI Cleanup Verification failed:`, err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

runProductionUiCleanupTests();
