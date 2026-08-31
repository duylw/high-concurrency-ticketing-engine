/**
 * Automated Verification Script for Auth & RBAC Endpoints
 * Tests: Register -> Login -> /me -> RBAC Forbidden -> Refresh Token -> Logout -> Revoked Token Check
 */

const BASE_URL = "http://localhost:5001/api/v1";

const logStep = (step, title) => {
  console.log(`\n======================================================`);
  console.log(`🧪 [STEP ${step}] ${title}`);
  console.log(`======================================================`);
};

const runTests = async () => {
  const timestamp = Date.now();
  const testUser = {
    email: `dev_${timestamp}@example.com`,
    username: `dev_${timestamp}`,
    password: "Password123!",
    name: "Dev Tester",
  };

  let accessToken = "";
  let refreshToken = "";

  try {
    // ----------------------------------------------------
    // TEST 1: Register New User
    // ----------------------------------------------------
    logStep(1, "POST /api/v1/auth/register");
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    console.log("Status:", regRes.status);
    console.log("Response:", JSON.stringify(regData, null, 2));

    if (regRes.status !== 201 || !regData.data.tokens.accessToken) {
      throw new Error("Register test failed!");
    }
    console.log("✅ Register Successful!");

    // ----------------------------------------------------
    // TEST 2: Login
    // ----------------------------------------------------
    logStep(2, "POST /api/v1/auth/login");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });
    const loginData = await loginRes.json();
    console.log("Status:", loginRes.status);
    console.log("Response:", JSON.stringify(loginData, null, 2));

    if (loginRes.status !== 200 || !loginData.data.tokens.accessToken) {
      throw new Error("Login test failed!");
    }

    accessToken = loginData.data.tokens.accessToken;
    refreshToken = loginData.data.tokens.refreshToken;
    console.log("✅ Login Successful! Tokens captured.");

    // ----------------------------------------------------
    // TEST 3: Access Protected Route (/me)
    // ----------------------------------------------------
    logStep(3, "GET /api/v1/auth/me (With Bearer Token)");
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const meData = await meRes.json();
    console.log("Status:", meRes.status);
    console.log("Response:", JSON.stringify(meData, null, 2));

    if (meRes.status !== 200 || meData.data.email !== testUser.email) {
      throw new Error("/me endpoint failed!");
    }
    console.log("✅ Protected Route /me Successful!");

    // ----------------------------------------------------
    // TEST 4: RBAC Forbidden Check (/users requires ADMIN)
    // ----------------------------------------------------
    logStep(4, "GET /api/v1/users (Expect 403 Forbidden for USER role)");
    const rbacRes = await fetch(`${BASE_URL}/users`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const rbacData = await rbacRes.json();
    console.log("Status:", rbacRes.status);
    console.log("Response:", JSON.stringify(rbacData, null, 2));

    if (rbacRes.status !== 403) {
      throw new Error("RBAC test failed! Expected 403 Forbidden.");
    }
    console.log("✅ RBAC Middleware successfully blocked non-admin user with 403 Forbidden!");

    // ----------------------------------------------------
    // TEST 5: Refresh Token (/refresh-token)
    // ----------------------------------------------------
    logStep(5, "POST /api/v1/auth/refresh-token");
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const refreshData = await refreshRes.json();
    console.log("Status:", refreshRes.status);
    console.log("Response:", JSON.stringify(refreshData, null, 2));

    if (refreshRes.status !== 200 || !refreshData.data.accessToken) {
      throw new Error("Refresh token test failed!");
    }
    const newAccessToken = refreshData.data.accessToken;
    console.log("✅ Refresh Token successfully issued new Access Token!");

    // ----------------------------------------------------
    // TEST 6: Logout (/logout)
    // ----------------------------------------------------
    logStep(6, "POST /api/v1/auth/logout");
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const logoutData = await logoutRes.json();
    console.log("Status:", logoutRes.status);
    console.log("Response:", JSON.stringify(logoutData, null, 2));

    if (logoutRes.status !== 200) {
      throw new Error("Logout test failed!");
    }
    console.log("✅ Logout Successful! Refresh Token deleted from Database.");

    // ----------------------------------------------------
    // TEST 7: Attempt using deleted/revoked Refresh Token
    // ----------------------------------------------------
    logStep(7, "POST /api/v1/auth/refresh-token (With logged-out token -> Expect 401)");
    const revokedRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const revokedData = await revokedRes.json();
    console.log("Status:", revokedRes.status);
    console.log("Response:", JSON.stringify(revokedData, null, 2));

    if (revokedRes.status !== 401) {
      throw new Error("Revocation check failed! Expected 401 Unauthorized.");
    }
    console.log("✅ Server successfully rejected logged-out/revoked token with 401 Unauthorized!");

    console.log(`\n🎉 ALL 7 VERIFICATION TESTS PASSED PERFECTLY! 🚀\n`);
  } catch (error) {
    console.error("❌ Test suite failed:", error.message);
    process.exit(1);
  }
};

runTests();
