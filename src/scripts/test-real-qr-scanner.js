import { config } from "dotenv";
config();

import qrcode from "qrcode-generator";
globalThis.qrcode = qrcode;

import jsQR from "jsqr";
import { generateQrSvg } from "../../public/js/utils/qrcode.util.js";
import { authApi } from "../../public/js/modules/auth/auth.api.js";
import { authStore } from "../../public/js/modules/auth/auth.store.js";
import { ordersApi } from "../../public/js/modules/orders/orders.api.js";
import { organizerApi } from "../../public/js/modules/organizer/organizer.api.js";
import { CONFIG } from "../../public/js/core/config.js";
import { prismaClient } from "../config/db.js";

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;

const logStep = (step, title) => {
  console.log(`\n======================================================`);
  console.log(`[REAL QR SCANNER TEST STEP ${step}] ${title}`);
  console.log(`======================================================`);
};

/**
 * Utility to render a qrcode-generator instance into raw RGBA pixels for jsQR decoding simulation
 */
function renderQrToRgbaPixels(rawString, scale = 8) {
  const qr = qrcode(0, "M");
  qr.addData(rawString);
  qr.make();

  const count = qr.getModuleCount();
  const width = count * scale;
  const height = count * scale;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      const isDark = qr.isDark(r, c);
      const val = isDark ? 0 : 255;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = ((r * scale + dy) * width + (c * scale + dx)) * 4;
          data[px] = val;       // R
          data[px + 1] = val;   // G
          data[px + 2] = val;   // B
          data[px + 3] = 255;   // A
        }
      }
    }
  }

  return { data, width, height, moduleCount: count };
}

const runRealQrScannerTests = async () => {
  console.log(`\n======================================================`);
  console.log(`[TEST RUNNER] Starting Task 13 Real QR Code Issuance & Multi-Channel Scanner Verification...`);
  console.log(`======================================================`);

  try {
    CONFIG.API_BASE_URL = `${BASE_URL}/api/v1`;

    // ----------------------------------------------------
    // STEP 1: Static Asset & Library Integrity
    // ----------------------------------------------------
    logStep(1, "Verify CDN Libraries in index.html & Static Assets");

    const indexRes = await fetch(`${BASE_URL}/`);
    const indexHtml = await indexRes.text();

    if (!indexHtml.includes("qrcode.min.js") || !indexHtml.includes("jsQR.min.js")) {
      throw new Error(`[FAIL] index.html does not include qrcode-generator and jsQR script tags!`);
    }
    console.log(`[PASSED] qrcode-generator and jsQR CDN scripts present in index.html.`);

    const scannerCssRes = await fetch(`${BASE_URL}/css/components/scanner.css`);
    const scannerCss = await scannerCssRes.text();
    if (!scannerCss.includes(".scanner-overlay-laser.is-detected") || !scannerCss.includes(".scanner-viewport-box.is-dragover")) {
      throw new Error(`[FAIL] scanner.css is missing detection flash or dragover classes!`);
    }
    console.log(`[PASSED] scanner.css includes laser detection flash and dragover styling.`);

    const scannerJsRes = await fetch(`${BASE_URL}/js/modules/organizer/gate-scanner.view.js`);
    const scannerJs = await scannerJsRes.text();
    if (!scannerJs.includes("_decodeImageFile") || !scannerJs.includes("_decodeImageElement") || !scannerJs.includes("btn-upload-qr")) {
      throw new Error(`[FAIL] gate-scanner.view.js missing multi-channel methods!`);
    }
    console.log(`[PASSED] gate-scanner.view.js includes image decoder & multi-channel controls.`);

    // ----------------------------------------------------
    // STEP 2: ISO/IEC 18004 Standard QR Code Generation
    // ----------------------------------------------------
    logStep(2, "Test Standard ISO/IEC 18004 SVG QR Generation");

    const sampleTicketCode = "TKT-202609-ABCD1234-01";
    const qrSvg = generateQrSvg(sampleTicketCode, 240);

    if (!qrSvg.includes("<svg") || !qrSvg.includes("viewBox=") || !qrSvg.includes("</svg>")) {
      throw new Error(`[FAIL] generateQrSvg did not return valid SVG XML!`);
    }
    console.log(`[INFO] Generated SVG QR length: ${qrSvg.length} characters.`);
    console.log(`[PASSED] ISO/IEC 18004 SVG QR code generated successfully.`);

    // ----------------------------------------------------
    // STEP 3: jsQR Pixel Decoding Round-Trip Test
    // ----------------------------------------------------
    logStep(3, "Test Pixel Rasterization & jsQR Decoding Round-Trip");

    const pixelFrame = renderQrToRgbaPixels(sampleTicketCode, 8);
    console.log(`[INFO] Rasterized frame: ${pixelFrame.width}x${pixelFrame.height}px, matrix: ${pixelFrame.moduleCount}x${pixelFrame.moduleCount}`);

    const decoded = jsQR(pixelFrame.data, pixelFrame.width, pixelFrame.height, {
      inversionAttempts: "dontInvert",
    });

    if (!decoded || decoded.data !== sampleTicketCode) {
      throw new Error(`[FAIL] jsQR decoding mismatch! Expected "${sampleTicketCode}", got "${decoded?.data}"`);
    }
    console.log(`[PASSED] jsQR successfully decoded QR matrix -> "${decoded.data}".`);

    // ----------------------------------------------------
    // STEP 4: End-to-End Real Check-in via Decoded QR Code
    // ----------------------------------------------------
    logStep(4, "End-to-End Ticket Purchase -> QR Decode -> Gate Check-in");

    // 1. Login Organizer
    const orgLogin = await authApi.login({
      email: "organizer@ticketing.com",
      password: "Password123!",
    });
    const orgToken = orgLogin.data?.tokens?.accessToken || orgLogin.data?.accessToken;
    const orgRefreshToken = orgLogin.data?.tokens?.refreshToken || orgLogin.data?.refreshToken;
    const orgUser = orgLogin.data.user;

    authStore.setAuth({ user: orgUser, accessToken: orgToken, refreshToken: orgRefreshToken });

    // Find active event and tier with stock
    const myEventsRes = await organizerApi.getMyEvents();
    const myEvents = Array.isArray(myEventsRes.data) ? myEventsRes.data : (myEventsRes.data?.events || []);
    let targetEvent = myEvents.find(e => e.status === "PUBLISHED" && e.ticketTiers?.some(t => (t.availableStock ?? t.totalStock) > 0));

    if (!targetEvent) {
      const now = new Date();
      const newEvent = await organizerApi.createEvent({
        title: `QR Scanner Live Event ${Date.now()}`,
        description: "Live concert for real QR code scanner validation",
        venue: "Sân Vận Động Mỹ Đình",
        startTime: new Date(now.getTime() + 86400000).toISOString(),
        endTime: new Date(now.getTime() + 90000000).toISOString(),
        saleStartTime: new Date(now.getTime() - 60000).toISOString(),
        saleEndTime: new Date(now.getTime() + 86400000).toISOString(),
      });
      targetEvent = newEvent.data;
      const newTier = await organizerApi.createTicketTier(targetEvent.id, {
        name: "Standard VIP Tier",
        price: 750000,
        totalStock: 50,
      });
      targetEvent.ticketTiers = [newTier.data];
    }

    const testTier = targetEvent.ticketTiers.find(t => (t.availableStock ?? t.totalStock) > 0) || targetEvent.ticketTiers[0];

    // 2. Buyer buys ticket
    const buyerLogin = await authApi.login({
      email: "buyer@ticketing.com",
      password: "Password123!",
    });
    const buyerToken = buyerLogin.data?.tokens?.accessToken || buyerLogin.data?.accessToken;
    const buyerRefreshToken = buyerLogin.data?.tokens?.refreshToken || buyerLogin.data?.refreshToken;
    const buyerUser = buyerLogin.data.user;

    authStore.setAuth({ user: buyerUser, accessToken: buyerToken, refreshToken: buyerRefreshToken });

    const holdRes = await ordersApi.holdTicket({
      ticketTierId: testTier.id,
      quantity: 1,
    });
    const heldOrder = holdRes.data?.order || holdRes.data;

    const checkoutRes = await ordersApi.checkout(heldOrder.id, {
      paymentMethod: "CREDIT_CARD",
      idempotencyKey: `real_qr_test_${Date.now()}`,
    });
    const completedOrder = checkoutRes.data?.order || checkoutRes.data;

    // Fetch order details via getMyOrders to retrieve tickets
    const myOrdersRes = await ordersApi.getMyOrders();
    const ordersList = myOrdersRes.data?.orders || myOrdersRes.data || [];
    const detailedOrder = ordersList.find(o => o.id === completedOrder.id) || completedOrder;

    // Determine target code to encode into QR
    let targetCodeToScan = detailedOrder.tickets?.[0]?.ticketCode || detailedOrder.ticketCode || detailedOrder.id;
    console.log(`[INFO] Issued E-Ticket with Code: "${targetCodeToScan}"`);

    // 3. Generate QR code for this real ticket and decode with jsQR
    const realTicketFrame = renderQrToRgbaPixels(targetCodeToScan, 8);
    const scannedCode = jsQR(realTicketFrame.data, realTicketFrame.width, realTicketFrame.height, {
      inversionAttempts: "dontInvert",
    });

    if (!scannedCode || scannedCode.data !== targetCodeToScan) {
      throw new Error(`[FAIL] Camera/Image simulated scanning failed to decode issued ticket code!`);
    }
    console.log(`[PASSED] Simulated Camera/Image decoder successfully read: "${scannedCode.data}"`);

    // 4. Organizer checks in via decoded value
    authStore.setAuth({ user: orgUser, accessToken: orgToken, refreshToken: orgRefreshToken });

    const checkInUrl = `${BASE_URL}/api/v1/orders/${scannedCode.data}/check-in`;
    const checkInRes = await fetch(checkInUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${orgToken}`,
      },
    });

    const checkInData = await checkInRes.json();
    if (checkInRes.status !== 200 || !checkInData.success) {
      throw new Error(`[FAIL] Check-in endpoint failed with status ${checkInRes.status}: ${JSON.stringify(checkInData)}`);
    }

    console.log(`[INFO] Check-in Success: Attendee "${checkInData.data?.user?.name || checkInData.data?.user?.email}"`);
    console.log(`[INFO] Status: ${checkInData.data?.status}`);
    console.log(`[PASSED] Gate check-in completed successfully using decoded QR code.`);

    // ----------------------------------------------------
    // STEP 5: Anti-Passback Defense on Re-scanned QR Code
    // ----------------------------------------------------
    logStep(5, "Test Anti-Passback Defense on Re-scanned QR Code");

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

    console.log(`[INFO] Re-scan rejected with HTTP 409 Conflict: "${recheckData.message}"`);
    console.log(`[PASSED] Anti-Passback successfully blocked re-used QR code.`);

    console.log(`\n======================================================`);
    console.log(`[SUCCESS] ALL TASK 13 REAL QR ISSUANCE & MULTI-CHANNEL SCANNER CHECKS PASSED 100%!`);
    console.log(`1. CDN script tags & CSS classes verified.`);
    console.log(`2. ISO/IEC 18004 SVG QR code generation verified.`);
    console.log(`3. jsQR matrix rasterization and pixel decoding round-trip verified.`);
    console.log(`4. Live ticket purchase -> QR generation -> jsQR decode -> Gate Check-in passed.`);
    console.log(`5. Anti-Passback defense on re-scanned QR code verified with HTTP 409.`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error(`\n[ERROR] Real QR Scanner Verification failed:`, err.message);
    process.exit(1);
  } finally {
    await prismaClient.$disconnect();
    process.exit(0);
  }
};

runRealQrScannerTests();
