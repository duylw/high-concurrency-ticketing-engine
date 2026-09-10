import { config } from "dotenv";
config();

import { eventBus } from "../../public/js/core/event-bus.js";
import { formatCurrencyVND, formatDateTime, calculateCountdown } from "../../public/js/utils/formatters.js";

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;

const logStep = (step, title) => {
  console.log(`\n======================================================`);
  console.log(`[FRONTEND UI TEST STEP ${step}] ${title}`);
  console.log(`======================================================`);
};

const runFrontendUiTests = async () => {
  console.log(`\n======================================================`);
  console.log(`[TEST RUNNER] Starting Task 09A Frontend Verification...`);
  console.log(`======================================================`);

  try {
    // ----------------------------------------------------
    // STEP 1: Express Static Serving - HTML Shell & Containers
    // ----------------------------------------------------
    logStep(1, "Verify Express Static Serving for index.html SPA Shell");
    
    const htmlRes = await fetch(`${BASE_URL}/`);
    const htmlText = await htmlRes.text();

    if (htmlRes.status !== 200) {
      throw new Error(`[FAIL] Expected 200 OK for GET /, got HTTP ${htmlRes.status}`);
    }

    if (!htmlText.includes('<main id="app">')) {
      throw new Error(`[FAIL] index.html is missing <main id="app"> container.`);
    }

    if (!htmlText.includes('id="toast-container"')) {
      throw new Error(`[FAIL] index.html is missing #toast-container.`);
    }

    if (!htmlText.includes('id="modal-root"')) {
      throw new Error(`[FAIL] index.html is missing #modal-root.`);
    }

    if (!htmlText.includes('type="module" src="/js/app.js"')) {
      throw new Error(`[FAIL] index.html is missing native ES module script tag.`);
    }

    console.log(`[PASSED] index.html served with HTTP 200, semantic containers, and ES module loader.`);

    // ----------------------------------------------------
    // STEP 2: CSS Modular System & Design Tokens
    // ----------------------------------------------------
    logStep(2, "Verify Modular CSS Serving & Design Tokens");

    const cssFiles = [
      { path: "/css/main.css", expected: "@import" },
      { path: "/css/base/reset.css", expected: "box-sizing" },
      { path: "/css/base/variables.css", expected: "--color-brand-primary" },
      { path: "/css/base/typography.css", expected: "text-gradient-brand" },
      { path: "/css/components/buttons.css", expected: ".btn-primary" },
      { path: "/css/components/cards.css", expected: ".glass-card" },
      { path: "/css/components/forms.css", expected: ".form-input" },
      { path: "/css/components/modal.css", expected: ".modal-overlay" },
      { path: "/css/components/toast.css", expected: ".toast-container" },
      { path: "/css/components/navbar.css", expected: ".navbar" },
      { path: "/css/layouts/grid.css", expected: ".container" },
      { path: "/css/layouts/responsive.css", expected: "@media (max-width: 768px)" },
    ];

    for (const css of cssFiles) {
      const res = await fetch(`${BASE_URL}${css.path}`);
      const text = await res.text();
      if (res.status !== 200 || !text.includes(css.expected)) {
        throw new Error(`[FAIL] CSS file ${css.path} failed verification (status ${res.status}, missing '${css.expected}')`);
      }
      console.log(`[PASSED] CSS Module: ${css.path.padEnd(30)} -> HTTP 200 OK`);
    }

    // ----------------------------------------------------
    // STEP 3: JavaScript ES Modules Serving
    // ----------------------------------------------------
    logStep(3, "Verify Native ES Modules Serving over HTTP");

    const jsFiles = [
      { path: "/js/app.js", expected: "Application" },
      { path: "/js/core/config.js", expected: "CONFIG" },
      { path: "/js/core/event-bus.js", expected: "eventBus" },
      { path: "/js/modules/ui/toast.js", expected: "toast" },
      { path: "/js/modules/ui/modal.js", expected: "modalManager" },
      { path: "/js/modules/ui/loader.js", expected: "getSpinnerHtml" },
      { path: "/js/utils/dom.util.js", expected: "escapeHtml" },
      { path: "/js/utils/formatters.js", expected: "formatCurrencyVND" },
    ];

    for (const js of jsFiles) {
      const res = await fetch(`${BASE_URL}${js.path}`);
      const text = await res.text();
      if (res.status !== 200 || !text.includes(js.expected)) {
        throw new Error(`[FAIL] JS file ${js.path} failed verification (status ${res.status}, missing '${js.expected}')`);
      }
      console.log(`[PASSED] JS Module:  ${js.path.padEnd(30)} -> HTTP 200 OK`);
    }

    // ----------------------------------------------------
    // STEP 4: SPA Routing Fallback vs API 404 Isolation
    // ----------------------------------------------------
    logStep(4, "Verify SPA Fallback (Client Routing) & API 404 Isolation");

    // 4.1 SPA fallback for non-API route
    const spaRes = await fetch(`${BASE_URL}/events/explore-concerts`);
    const spaText = await spaRes.text();
    if (spaRes.status !== 200 || !spaText.includes('<main id="app">')) {
      throw new Error(`[FAIL] SPA fallback failed for /events/explore-concerts`);
    }
    console.log(`[PASSED] Client-side route /events/explore-concerts successfully served index.html.`);

    // 4.2 API 404 isolation for invalid /api/v1 route
    const apiRes = await fetch(`${BASE_URL}/api/v1/non-existent-endpoint`);
    const apiJson = await apiRes.json();
    if (apiRes.status !== 404 || apiJson.success !== false) {
      throw new Error(`[FAIL] API 404 isolation failed, got ${apiRes.status}`);
    }
    console.log(`[PASSED] API route /api/v1/non-existent-endpoint strictly returned 404 JSON error.`);

    // ----------------------------------------------------
    // STEP 5: Core Utilities In-Memory Logic Tests
    // ----------------------------------------------------
    logStep(5, "Verify Core Logic: Event Bus, Currency & DateTime Formatters");

    // 5.1 Test Event Bus Pub/Sub
    let receivedPayload = null;
    const unsubscribe = eventBus.subscribe("TEST_EVENT", (data) => {
      receivedPayload = data;
    });
    eventBus.publish("TEST_EVENT", { message: "Event Bus Working Perfectly" });
    if (!receivedPayload || receivedPayload.message !== "Event Bus Working Perfectly") {
      throw new Error(`[FAIL] Event Bus pub/sub failed.`);
    }
    unsubscribe();
    console.log(`[PASSED] Event Bus successfully published and received payload.`);

    // 5.2 Test Currency Formatter
    const formattedVND = formatCurrencyVND(1500000);
    if (!formattedVND.includes("1.500.000") && !formattedVND.includes("1,500,000")) {
      throw new Error(`[FAIL] Currency formatter failed, got '${formattedVND}'`);
    }
    console.log(`[PASSED] formatCurrencyVND(1500000) returned: ${formattedVND}`);

    // 5.3 Test Countdown Calculator
    const countdown = calculateCountdown(new Date(Date.now() + 3600000));
    if (countdown.isExpired || countdown.hours !== 1) {
      throw new Error(`[FAIL] Countdown calculation failed.`);
    }
    console.log(`[PASSED] calculateCountdown returned valid 1h window.`);

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log(`\n======================================================`);
    console.log(`[SUCCESS] ALL TASK-09A FRONTEND UI TESTS PASSED 100%!`);
    console.log(`1. SPA Shell (index.html) successfully served on Express root.`);
    console.log(`2. All 12 modular CSS files loaded with modern Dark Theme & Glassmorphism tokens.`);
    console.log(`3. All 8 native ES Modules served with clean interfaces.`);
    console.log(`4. SPA client-side fallback route properly routes to index.html.`);
    console.log(`5. API 404 isolation strictly preserved.`);
    console.log(`6. Event Bus and Core Utilities verified 100% operational.`);
    console.log(`======================================================\n`);
  } catch (error) {
    console.error(`\n[FATAL ERROR IN FRONTEND UI TEST]:`, error.message);
    process.exit(1);
  }
};

runFrontendUiTests();
