import { config } from "dotenv";
config();

import { httpClient } from "../../public/js/core/http-client.js";
import { authApi } from "../../public/js/modules/auth/auth.api.js";
import { authStore } from "../../public/js/modules/auth/auth.store.js";
import { eventBus } from "../../public/js/core/event-bus.js";
import { CONFIG } from "../../public/js/core/config.js";

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;

const logStep = (step, title) => {
  console.log(`\n======================================================`);
  console.log(`[FRONTEND AUTH TEST STEP ${step}] ${title}`);
  console.log(`======================================================`);
};

const runFrontendAuthTests = async () => {
  console.log(`\n======================================================`);
  console.log(`[TEST RUNNER] Starting Task 09B Frontend Auth & RTR Verification...`);
  console.log(`======================================================`);

  try {
    // ----------------------------------------------------
    // STEP 1: Verify Static Serving for All Task 09B ES Modules
    // ----------------------------------------------------
    logStep(1, "Verify HTTP 200 Serving for Task 09B Native ES Modules");

    const modules = [
      { path: "/js/core/http-client.js", expected: "HttpClient" },
      { path: "/js/modules/auth/auth.api.js", expected: "authApi" },
      { path: "/js/modules/auth/auth.store.js", expected: "authStore" },
      { path: "/js/modules/auth/auth.modal.js", expected: "authModal" },
      { path: "/js/modules/navigation/navbar.js", expected: "navbar" },
      { path: "/js/modules/navigation/router.js", expected: "router" },
    ];

    for (const mod of modules) {
      const res = await fetch(`${BASE_URL}${mod.path}`);
      const text = await res.text();
      if (res.status !== 200 || !text.includes(mod.expected)) {
        throw new Error(`[FAIL] Module ${mod.path} failed verification (status ${res.status}, missing '${mod.expected}')`);
      }
      console.log(`[PASSED] Module: ${mod.path.padEnd(35)} -> HTTP 200 OK`);
    }

    // Configure httpClient base URL for Node environment
    CONFIG.API_BASE_URL = `${BASE_URL}/api/v1`;

    // ----------------------------------------------------
    // STEP 2: Authentication Login Flow (Customer / User)
    // ----------------------------------------------------
    logStep(2, "Test Customer Login Flow & Reactive Auth Store");

    let authStateEvents = [];
    const unsub = eventBus.subscribe(CONFIG.EVENTS.AUTH_STATE_CHANGED, (state) => {
      authStateEvents.push(state);
    });

    const loginRes = await authApi.login({
      email: "buyer@ticketing.com",
      password: "Password123!",
    });

    const user = loginRes.data?.user;
    const accessToken = loginRes.data?.tokens?.accessToken || loginRes.data?.accessToken;
    const refreshToken = loginRes.data?.tokens?.refreshToken || loginRes.data?.refreshToken;

    if (!loginRes.success || !accessToken || !refreshToken) {
      throw new Error(`[FAIL] Login API failed to return valid tokens.`);
    }

    authStore.setAuth({ user, accessToken, refreshToken });

    if (!authStore.isAuthenticated) {
      throw new Error(`[FAIL] authStore.isAuthenticated should be true after login.`);
    }

    if (authStore.role !== "USER" || authStore.isOrganizer !== false) {
      throw new Error(`[FAIL] Role check failed for Customer account. Role: ${authStore.role}`);
    }

    if (authStateEvents.length === 0) {
      throw new Error(`[FAIL] EventBus did not receive AUTH_STATE_CHANGED event on login.`);
    }

    console.log(`[PASSED] Customer logged in successfully: ${user.email} (Role: ${user.role})`);
    console.log(`[PASSED] AuthStore reactive state updated and event dispatched.`);

    // ----------------------------------------------------
    // STEP 3: Authenticated Request with Bearer Token Injection
    // ----------------------------------------------------
    logStep(3, "Test Authenticated Request (GET /auth/me) with Injected Bearer Token");

    const profileRes = await authApi.getMe();
    if (!profileRes.success || profileRes.data?.email !== "buyer@ticketing.com") {
      throw new Error(`[FAIL] getMe failed or returned incorrect email: ${JSON.stringify(profileRes)}`);
    }

    console.log(`[PASSED] GET /auth/me returned 200 OK with authenticated user profile.`);

    // ----------------------------------------------------
    // STEP 4: Silent Refresh Token Rotation (RTR) on 401
    // ----------------------------------------------------
    logStep(4, "Test Silent Refresh Token Rotation (RTR) on Expired/Invalid Access Token");

    const initialAccessToken = authStore.accessToken;
    const initialRefreshToken = authStore.refreshToken;

    // Tamper with access token to simulate expiration
    const expiredMockToken = "tampered.expired.token";
    authStore.updateTokens({
      accessToken: expiredMockToken,
      refreshToken: initialRefreshToken,
    });

    console.log(`[INFO] Deliberately set invalid Access Token: "${expiredMockToken}"`);
    console.log(`[INFO] Calling authApi.getMe() -> Interceptor should catch 401, call /refresh-token, and retry...`);

    // This call will hit 401, trigger silent refresh, obtain new token, and retry successfully!
    const recoveredProfile = await authApi.getMe();

    if (!recoveredProfile.success || recoveredProfile.data?.email !== "buyer@ticketing.com") {
      throw new Error(`[FAIL] Silent RTR failed to recover request.`);
    }

    const newAccessToken = authStore.accessToken;
    const newRefreshToken = authStore.refreshToken;

    if (newAccessToken === expiredMockToken) {
      throw new Error(`[FAIL] Access Token was not updated after silent refresh.`);
    }

    if (newRefreshToken === initialRefreshToken) {
      throw new Error(`[FAIL] Refresh Token was not rotated after silent refresh.`);
    }

    console.log(`[PASSED] Interceptor intercepted 401, silently refreshed tokens, and completed original request.`);
    console.log(`[PASSED] Rotated Access Token:  ${newAccessToken.slice(0, 25)}...`);
    console.log(`[PASSED] Rotated Refresh Token: ${newRefreshToken.slice(0, 25)}...`);

    // ----------------------------------------------------
    // STEP 5: Concurrent 401 Queueing Defense (No Race Conditions)
    // ----------------------------------------------------
    logStep(5, "Test Concurrent 401 Queueing (Parallel Requests during Active Refresh)");

    // Invalidate access token once more
    authStore.updateTokens({
      accessToken: "tampered.concurrent.token",
      refreshToken: newRefreshToken,
    });

    console.log(`[INFO] Firing 3 parallel requests with invalid token simultaneously...`);
    const results = await Promise.all([
      authApi.getMe(),
      authApi.getMe(),
      authApi.getMe(),
    ]);

    for (let i = 0; i < results.length; i++) {
      if (!results[i]?.success || results[i].data?.email !== "buyer@ticketing.com") {
        throw new Error(`[FAIL] Parallel request ${i + 1} failed during queued silent refresh.`);
      }
    }

    console.log(`[PASSED] All 3 concurrent requests succeeded cleanly via queued refresh mutex!`);

    // ----------------------------------------------------
    // STEP 6: Role Verification & Switcher (Organizer)
    // ----------------------------------------------------
    logStep(6, "Test Organizer Authentication & Role Switcher");

    const orgLogin = await authApi.login({
      email: "organizer@ticketing.com",
      password: "Password123!",
    });

    if (!orgLogin.success || orgLogin.data?.user?.role !== "ORGANIZER") {
      throw new Error(`[FAIL] Organizer login failed.`);
    }

    const orgUser = orgLogin.data?.user;
    const orgAccessToken = orgLogin.data?.tokens?.accessToken || orgLogin.data?.accessToken;
    const orgRefreshToken = orgLogin.data?.tokens?.refreshToken || orgLogin.data?.refreshToken;

    authStore.setAuth({
      user: orgUser,
      accessToken: orgAccessToken,
      refreshToken: orgRefreshToken,
    });

    if (!authStore.isOrganizer) {
      throw new Error(`[FAIL] authStore.isOrganizer should be true for Organizer.`);
    }

    console.log(`[PASSED] Organizer login verified. Role: ${authStore.role} | isOrganizer: ${authStore.isOrganizer}`);

    // ----------------------------------------------------
    // STEP 7: Logout Flow & Session Revocation
    // ----------------------------------------------------
    logStep(7, "Test Logout Flow & Session Cleanup");

    const logoutRes = await authApi.logout(authStore.refreshToken);
    if (!logoutRes.success) {
      throw new Error(`[FAIL] Logout API call failed.`);
    }

    authStore.clearAuth();

    if (authStore.isAuthenticated || authStore.accessToken !== null || authStore.user !== null) {
      throw new Error(`[FAIL] authStore state was not completely reset on clearAuth.`);
    }

    console.log(`[PASSED] Server session revoked and authStore successfully reset to guest.`);

    unsub();

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log(`\n======================================================`);
    console.log(`[SUCCESS] ALL TASK-09B FRONTEND AUTH & RTR TESTS PASSED 100%!`);
    console.log(`1. All 6 Task 09B Native ES Modules verified.`);
    console.log(`2. Customer Login and Reactive Auth Store state verified.`);
    console.log(`3. Authenticated requests inject Bearer Token automatically.`);
    console.log(`4. Silent Refresh Token Rotation (RTR) recovers 401 cleanly.`);
    console.log(`5. Concurrent request queueing eliminates refresh race conditions.`);
    console.log(`6. Organizer role switcher state verified.`);
    console.log(`7. Logout and session invalidation verified.`);
    console.log(`======================================================\n`);
  } catch (error) {
    console.error(`\n[FATAL ERROR IN FRONTEND AUTH TEST]:`, error.message);
    process.exit(1);
  }
};

runFrontendAuthTests();
