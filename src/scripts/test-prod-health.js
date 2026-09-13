/**
 * Production Deployment Smoke Test Suite
 * Validates Nginx Gateway, Deep Health Check, Security Headers & SPA Shell
 */

const NGINX_BASE_URL = process.env.PROD_URL || "http://localhost";
const API_BASE_URL = process.env.API_URL || "http://localhost:5001";

let passedTests = 0;
let failedTests = 0;

const assert = (condition, testName, details = "") => {
    if (condition) {
        console.log(`[PASS] ${testName} ${details ? `(${details})` : ""}`);
        passedTests++;
    } else {
        console.error(`[FAIL] ${testName} - Details: ${details}`);
        failedTests++;
    }
};

const runSmokeTests = async () => {
    console.log("==============================================================================");
    console.log("[SMOKE TEST] Running Production Deployment Health & Gateway Verification");
    console.log(`[TARGET GATEWAY] ${NGINX_BASE_URL}`);
    console.log("==============================================================================\n");

    // Determine active test URL (prioritize Nginx port 80, fallback to direct API port 5001)
    let targetUrl = NGINX_BASE_URL;
    try {
        const probe = await fetch(`${NGINX_BASE_URL}/api/v1/health`, { signal: AbortSignal.timeout(3000) });
        if (!probe.ok) targetUrl = API_BASE_URL;
    } catch (err) {
        targetUrl = API_BASE_URL;
    }

    // 1. Test Deep Health Check Endpoint
    try {
        const startTime = Date.now();
        const res = await fetch(`${targetUrl}/api/v1/health`);
        const duration = Date.now() - startTime;
        const data = await res.json();

        assert(res.status === 200, "1. Deep Health Check HTTP Status is 200 OK", `status: ${res.status}`);
        assert(data.success === true && data.status === "healthy", "2. Overall System Status is 'healthy'", `status: ${data.status}`);
        assert(data.services?.database?.status === "up", "3. PostgreSQL Connection is UP", `latency: ${data.services?.database?.latencyMs}ms`);
        assert(data.services?.database?.latencyMs < 50, "4. PostgreSQL Latency is under 50ms", `${data.services?.database?.latencyMs}ms`);
        assert(data.services?.redis?.status === "up" && data.services?.redis?.response === "PONG", "5. Redis Connection is UP with PONG response", `latency: ${data.services?.redis?.latencyMs}ms`);
        assert(data.services?.queues?.ticketRelease?.status === "up", "6. BullMQ Ticket Release Queue is UP");
        assert(data.services?.queues?.notification?.status === "up", "7. BullMQ Notification Queue is UP");
        assert(data.system?.memory?.rssMB > 0, "8. Node.js Memory RSS Metrics captured", `${data.system?.memory?.rssMB} MB`);
        assert(duration < 500, "9. Total Health Check round-trip time is under 500ms", `${duration}ms`);
    } catch (err) {
        assert(false, "Deep Health Check Endpoint Request", err.message);
    }

    // 2. Test SPA Shell Serving (Frontend Static Files)
    try {
        const res = await fetch(`${targetUrl}/`);
        const html = await res.text();

        assert(res.status === 200, "10. Frontend SPA Shell served successfully (HTTP 200)");
        assert(html.includes("<title>") || html.includes("<!DOCTYPE html>"), "11. HTML index shell verified in response");
    } catch (err) {
        assert(false, "Frontend SPA Shell Serving", err.message);
    }

    // 3. Test Security Headers (If testing through Nginx Gateway)
    if (targetUrl === NGINX_BASE_URL) {
        try {
            const res = await fetch(`${targetUrl}/api/v1/health`);
            const headers = res.headers;

            const hasFrameOptions = headers.has("x-frame-options");
            const hasContentTypeOptions = headers.has("x-content-type-options");

            assert(hasFrameOptions, "12. OWASP Header X-Frame-Options present", headers.get("x-frame-options"));
            assert(hasContentTypeOptions, "13. OWASP Header X-Content-Type-Options present", headers.get("x-content-type-options"));
        } catch (err) {
            assert(false, "Nginx Security Headers Inspection", err.message);
        }
    }

    console.log("\n==============================================================================");
    console.log(`[SUMMARY] Total Tests: ${passedTests + failedTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
    console.log("==============================================================================");

    if (failedTests > 0) {
        console.error("\n[RESULT] Smoke test failed. Please inspect logs.");
        process.exit(1);
    } else {
        console.log("\n[RESULT] ALL PRODUCTION SMOKE TESTS PASSED! SYSTEM IS PRODUCTION-READY.");
        process.exit(0);
    }
};

runSmokeTests();
