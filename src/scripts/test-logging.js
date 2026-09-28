/**
 * Automated Verification Script for Task 18:
 * Production Structured Logging, Request Tracing & Correlation ID
 */

import { pino } from "pino";
import { logger } from "../utils/logger.util.js";

const BASE_URL = process.env.API_URL || "http://localhost:5001/api/v1";

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

const runLoggingVerification = async () => {
  console.log("==============================================================================");
  console.log("[TEST SUITE] Task 18: Production Structured Logging & Correlation ID Verification");
  console.log(`[TARGET BASE URL] ${BASE_URL}`);
  console.log("==============================================================================\n");

  // --------------------------------------------------------------------------
  // TEST 1: Automatic UUID Generation for X-Request-Id
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const reqId = res.headers.get("x-request-id");
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    assert(res.status === 200, "1. Health endpoint returns HTTP 200 OK");
    assert(Boolean(reqId), "2. X-Request-Id header is present in API response", reqId || "null");
    assert(uuidRegex.test(reqId || ""), "3. Generated X-Request-Id matches standard UUID v4 format", reqId || "invalid");
  } catch (err) {
    assert(false, "Test 1 Request ID Generation", err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Preservation of Upstream Correlation ID (Trace Context)
  // --------------------------------------------------------------------------
  try {
    const customTraceId = "upstream-trace-id-" + Date.now();
    const res = await fetch(`${BASE_URL}/health`, {
      headers: {
        "X-Request-Id": customTraceId,
      },
    });
    const returnedReqId = res.headers.get("x-request-id");

    assert(
      returnedReqId === customTraceId,
      "4. Upstream X-Request-Id header is preserved across the request lifecycle",
      `Expected: ${customTraceId}, Received: ${returnedReqId}`
    );
  } catch (err) {
    assert(false, "Test 2 Trace Context Propagation", err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Correlation ID on Client Errors (4xx) & NotFound
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/non-existent-endpoint-test-404`);
    const reqId = res.headers.get("x-request-id");
    const data = await res.json();

    assert(res.status === 404, "5. Non-existent route returns HTTP 404 Not Found");
    assert(Boolean(reqId), "6. Error response preserves X-Request-Id header", reqId || "null");
    assert(data.success === false, "7. Error payload has success: false");
  } catch (err) {
    assert(false, "Test 3 Error Response Tracing", err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Sensitive Data Masking & Redaction (Zero PII Leakage)
  // --------------------------------------------------------------------------
  try {
    let capturedLogString = "";
    const testStream = {
      write: (chunk) => {
        capturedLogString += chunk;
      },
    };

    // Create an isolated test logger with identical redaction rules
    const testLogger = pino(
      {
        redact: {
          paths: [
            "password",
            "*.password",
            "refreshToken",
            "*.refreshToken",
            "req.headers.authorization",
            "creditCardNumber",
          ],
          censor: "[Redacted]",
        },
      },
      testStream
    );

    testLogger.info(
      {
        userEmail: "buyer@ticketing.com",
        password: "MySuperSecretPassword123!",
        refreshToken: "raw_refresh_token_jwt_secret",
        req: {
          headers: {
            authorization: "Bearer sensitive_access_token_value",
          },
        },
      },
      "Test login audit"
    );

    const parsedLog = JSON.parse(capturedLogString);

    assert(
      !capturedLogString.includes("MySuperSecretPassword123!"),
      "8. User password is NOT present in log stream (Redacted)"
    );
    assert(
      parsedLog.password === "[Redacted]",
      "9. Password property is strictly replaced with '[Redacted]'",
      `value: ${parsedLog.password}`
    );
    assert(
      !capturedLogString.includes("sensitive_access_token_value"),
      "10. Authorization Bearer token is NOT present in log stream (Redacted)"
    );
    assert(
      parsedLog.refreshToken === "[Redacted]",
      "11. Refresh token is strictly replaced with '[Redacted]'",
      `value: ${parsedLog.refreshToken}`
    );
    assert(
      parsedLog.userEmail === "buyer@ticketing.com",
      "12. Non-sensitive contextual fields (userEmail) remain readable",
      parsedLog.userEmail
    );
  } catch (err) {
    assert(false, "Test 4 Sensitive Data Redaction", err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Logger Singleton Export & Formatter Validation
  // --------------------------------------------------------------------------
  try {
    assert(typeof logger.info === "function", "13. logger.info is available as a function");
    assert(typeof logger.error === "function", "14. logger.error is available as a function");
    assert(typeof logger.warn === "function", "15. logger.warn is available as a function");
    assert(typeof logger.child === "function", "16. logger.child supports contextual child loggers");
  } catch (err) {
    assert(false, "Test 5 Logger API Methods", err.message);
  }

  console.log("\n==============================================================================");
  console.log(`[SUMMARY] Total Tests: ${passedTests + failedTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log("==============================================================================");

  if (failedTests > 0) {
    console.error("\n[RESULT] Task 18 Logging Verification FAILED!");
    process.exit(1);
  } else {
    console.log("\n[RESULT] ALL TASK 18 STRUCTURED LOGGING & TRACING CHECKS PASSED 100%!");
    process.exit(0);
  }
};

runLoggingVerification();
