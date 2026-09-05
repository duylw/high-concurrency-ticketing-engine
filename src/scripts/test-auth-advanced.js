import { config } from "dotenv";
config();

import { prismaClient } from "../config/db.js";
import { hashToken } from "../utils/crypto.util.js";

const BASE_URL = `http://localhost:${process.env.PORT || 5001}/api/v1`;

const logStep = (step, title) => {
  console.log(`\n======================================================`);
  console.log(`[TEST STEP ${step}] ${title}`);
  console.log(`======================================================`);
};

const runAdvancedAuthTests = async () => {
  const timestamp = Date.now();
  const testUser = {
    email: `rtr_${timestamp}@example.com`,
    username: `rtr_${timestamp}`,
    password: "StrongPassword123!",
    name: "RTR Tester",
  };

  try {
    // ----------------------------------------------------
    // TEST 1: Register User & Verify SHA-256 Storage
    // ----------------------------------------------------
    logStep(1, "POST /api/v1/auth/register & DB SHA-256 Hash Verification");
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    console.log("Status:", regRes.status);

    if (regRes.status !== 201 || !regData.data.tokens.refreshToken) {
      throw new Error("Register failed: " + JSON.stringify(regData));
    }

    const rawRefreshToken1 = regData.data.tokens.refreshToken;
    const expectedHash1 = hashToken(rawRefreshToken1);

    // Query DB directly to verify token is hashed
    const dbRecord = await prismaClient.refreshToken.findUnique({
      where: { token: expectedHash1 },
    });

    if (!dbRecord) {
      throw new Error("SHA-256 hash not found in database!");
    }
    if (dbRecord.token === rawRefreshToken1) {
      throw new Error("SECURITY FAILURE: Raw JWT is stored unhashed in database!");
    }
    console.log("[PASSED] Refresh token is securely stored as SHA-256 hash in DB.");

    // ----------------------------------------------------
    // TEST 2: Active Sessions Management (GET /auth/sessions)
    // ----------------------------------------------------
    logStep(2, "GET /api/v1/auth/sessions");
    let currentAccessToken = regData.data.tokens.accessToken;

    const sessionsRes = await fetch(`${BASE_URL}/auth/sessions`, {
      headers: { Authorization: `Bearer ${currentAccessToken}` },
    });
    const sessionsData = await sessionsRes.json();
    console.log("Status:", sessionsRes.status);
    console.log("Sessions Count:", sessionsData.data.total);

    if (sessionsRes.status !== 200 || sessionsData.data.total < 1) {
      throw new Error("Failed to retrieve active sessions: " + JSON.stringify(sessionsData));
    }
    console.log("[PASSED] Active session list retrieved successfully.");

    // ----------------------------------------------------
    // TEST 3: Refresh Token Rotation (RTR)
    // ----------------------------------------------------
    logStep(3, "POST /api/v1/auth/refresh-token (Token Rotation)");
    const rotateRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rawRefreshToken1 }),
    });
    const rotateData = await rotateRes.json();
    console.log("Status:", rotateRes.status);

    if (rotateRes.status !== 200 || !rotateData.data.tokens.refreshToken) {
      throw new Error("Token rotation failed: " + JSON.stringify(rotateData));
    }

    const rawRefreshToken2 = rotateData.data.tokens.refreshToken;
    const newAccessToken = rotateData.data.tokens.accessToken;

    if (rawRefreshToken2 === rawRefreshToken1) {
      throw new Error("SECURITY FAILURE: Refresh token was not rotated!");
    }
    console.log("[PASSED] Server successfully rotated token and issued a brand new Refresh Token.");

    // Verify old token is marked as revoked in DB
    const oldTokenDoc = await prismaClient.refreshToken.findUnique({
      where: { token: expectedHash1 },
    });
    if (!oldTokenDoc || !oldTokenDoc.isRevoked) {
      throw new Error("Old refresh token was not marked as isRevoked=true in DB!");
    }
    console.log("[PASSED] Old token status in DB verified: isRevoked = true.");

    // ----------------------------------------------------
    // TEST 4: Reuse Detection (Replay Attack Defense)
    // ----------------------------------------------------
    logStep(4, "POST /api/v1/auth/refresh-token with OLD revoked token (Expect 403 & All Sessions Revoked)");
    const replayRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rawRefreshToken1 }),
    });
    const replayData = await replayRes.json();
    console.log("Status:", replayRes.status);
    console.log("Message:", replayData.message);

    if (replayRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden on reuse attempt, got ${replayRes.status}`);
    }
    console.log("[PASSED] Replay attack blocked with 403 Forbidden.");

    // Verify all sessions were terminated for security
    const remainingSessions = await prismaClient.refreshToken.findMany({
      where: { userId: dbRecord.userId },
    });
    if (remainingSessions.length !== 0) {
      throw new Error("Reuse detection failed to delete all compromised sessions!");
    }
    console.log("[PASSED] All sessions for user were purged from database.");

    // ----------------------------------------------------
    // TEST 5: Login to Create 2 Sessions & Test Session Revocation
    // ----------------------------------------------------
    logStep(5, "Multi-session Creation & Individual Session Revocation");
    // Session A (Mobile)
    const loginMobileRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MobileApp/1.0.0",
      },
      body: JSON.stringify({ email: testUser.email, password: testUser.password }),
    });
    const loginMobileData = await loginMobileRes.json();

    // Session B (Desktop)
    const loginDesktopRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "DesktopBrowser/Chrome",
      },
      body: JSON.stringify({ email: testUser.email, password: testUser.password }),
    });
    const loginDesktopData = await loginDesktopRes.json();

    const authDesktopToken = loginDesktopData.data.tokens.accessToken;

    // Check sessions count
    const listSessionsRes = await fetch(`${BASE_URL}/auth/sessions`, {
      headers: { Authorization: `Bearer ${authDesktopToken}` },
    });
    const listSessionsData = await listSessionsRes.json();
    console.log("Active Sessions Count:", listSessionsData.data.total);

    if (listSessionsData.data.total !== 2) {
      throw new Error("Expected 2 active sessions, got " + listSessionsData.data.total);
    }

    // Revoke Mobile Session
    const mobileSessionId = listSessionsData.data.sessions.find((s) =>
      s.userAgent?.includes("MobileApp")
    )?.id;

    if (!mobileSessionId) {
      throw new Error("Could not find mobile session id");
    }

    const revokeRes = await fetch(`${BASE_URL}/auth/sessions/${mobileSessionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authDesktopToken}` },
    });
    console.log("Revoke Status:", revokeRes.status);
    if (revokeRes.status !== 200) {
      throw new Error("Failed to revoke session: " + revokeRes.status);
    }

    // Verify 1 session left
    const checkAfterRevoke = await fetch(`${BASE_URL}/auth/sessions`, {
      headers: { Authorization: `Bearer ${authDesktopToken}` },
    });
    const checkAfterData = await checkAfterRevoke.json();
    console.log("Sessions count after revocation:", checkAfterData.data.total);
    if (checkAfterData.data.total !== 1) {
      throw new Error("Session was not revoked properly!");
    }
    console.log("[PASSED] Targeted session revocation verified.");

    // ----------------------------------------------------
    // TEST 6: Logout-All Devices
    // ----------------------------------------------------
    logStep(6, "POST /api/v1/auth/logout-all");
    const logoutAllRes = await fetch(`${BASE_URL}/auth/logout-all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authDesktopToken}` },
    });
    console.log("Logout All Status:", logoutAllRes.status);
    if (logoutAllRes.status !== 200) {
      throw new Error("Logout all failed: " + logoutAllRes.status);
    }

    const finalSessions = await prismaClient.refreshToken.findMany({
      where: { userId: dbRecord.userId },
    });
    if (finalSessions.length !== 0) {
      throw new Error("Sessions still exist after logout-all!");
    }
    console.log("[PASSED] All sessions terminated across all devices.");

    console.log(`\n[SUCCESS] ALL TASK-02 AUTH ADVANCED VERIFICATION TESTS PASSED PERFECTLY.\n`);
    process.exit(0);
  } catch (error) {
    console.error("[ERROR] Task 02 verification failed:", error);
    process.exit(1);
  }
};

runAdvancedAuthTests();
