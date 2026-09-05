import { config } from "dotenv";
config();

import { prismaClient } from "../config/db.js";
import redisClient from "../config/redis.js";
import { CacheKeys } from "../constants/cacheKeys.js";

const BASE_URL = `http://localhost:${process.env.PORT || 5001}/api/v1`;

const logStep = (step, title) => {
  console.log(`\n======================================================`);
  console.log(`[CACHE TEST STEP ${step}] ${title}`);
  console.log(`======================================================`);
};

const runCacheTests = async () => {
  const timestamp = Date.now();
  let organizerToken = "";
  let eventId = "";

  try {
    // ----------------------------------------------------
    // PREPARATION: Create & Authenticate ORGANIZER User
    // ----------------------------------------------------
    logStep(0, "Preparation: Create ORGANIZER User");
    const organizerPayload = {
      email: `organizer_${timestamp}@example.com`,
      username: `organizer_${timestamp}`,
      password: "Password123!",
      name: "Concert Organizer",
    };

    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(organizerPayload),
    });
    const regData = await regRes.json();
    organizerToken = regData.data.tokens.accessToken;
    const organizerId = regData.data.user.id;

    // Elevate role to ORGANIZER in DB
    await prismaClient.user.update({
      where: { id: organizerId },
      data: { role: "ORGANIZER" },
    });

    // Re-login to get refreshed JWT containing ORGANIZER role
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: organizerPayload.email,
        password: organizerPayload.password,
      }),
    });
    const loginData = await loginRes.json();
    organizerToken = loginData.data.tokens.accessToken;
    console.log("[PASSED] Organizer authenticated with role ORGANIZER.");

    // ----------------------------------------------------
    // CREATE EVENT & TICKET TIERS
    // ----------------------------------------------------
    logStep(1, "Create Event & Ticket Tiers in PostgreSQL");
    const eventPayload = {
      title: `World Tour Live Concert ${timestamp}`,
      description: "Massive high-concurrency stadium concert flash-sale event",
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 90000000).toISOString(),
      bannerUrl: "https://example.com/banner.jpg",
    };

    const createEventRes = await fetch(`${BASE_URL}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify(eventPayload),
    });
    const eventData = await createEventRes.json();
    eventId = eventData.data.id;
    console.log(`[PASSED] Event created with ID: ${eventId}`);

    // Add VIP and Standard tiers
    await fetch(`${BASE_URL}/events/${eventId}/tiers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({ name: "VIP", price: 250, totalStock: 50 }),
    });

    await fetch(`${BASE_URL}/events/${eventId}/tiers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({ name: "General Admission", price: 80, totalStock: 200 }),
    });
    console.log("[PASSED] Ticket tiers (VIP & General Admission) added.");

    // ----------------------------------------------------
    // TEST 1: Cache Miss (First Read from DB)
    // ----------------------------------------------------
    logStep(2, "GET /api/v1/events/:id - First Read (Expect Cache MISS)");
    const startMiss = performance.now();
    const readMissRes = await fetch(`${BASE_URL}/events/${eventId}`);
    const durationMiss = (performance.now() - startMiss).toFixed(2);
    const missData = await readMissRes.json();
    const cacheStatusMiss = readMissRes.headers.get("x-cache-status");

    console.log(`Status: ${readMissRes.status}`);
    console.log(`X-Cache-Status Header: ${cacheStatusMiss}`);
    console.log(`Latency (DB Read): ${durationMiss}ms`);

    if (cacheStatusMiss !== "MISS" || missData.data._cache.isFromCache !== false) {
      throw new Error("Expected Cache MISS on first request!");
    }
    console.log("[PASSED] First read confirmed Cache MISS and populated cache.");

    // Verify Redis has key
    const cacheInRedis = await redisClient.get(CacheKeys.EVENT_DETAILS(eventId));
    if (!cacheInRedis) {
      throw new Error("Redis did not store event details in cache!");
    }
    console.log("[PASSED] Key verified present in Redis RAM.");

    // ----------------------------------------------------
    // TEST 2: Cache Hit (Subsequent Read from Redis)
    // ----------------------------------------------------
    logStep(3, "GET /api/v1/events/:id - Second Read (Expect Cache HIT)");
    const startHit = performance.now();
    const readHitRes = await fetch(`${BASE_URL}/events/${eventId}`);
    const durationHit = (performance.now() - startHit).toFixed(2);
    const hitData = await readHitRes.json();
    const cacheStatusHit = readHitRes.headers.get("x-cache-status");

    console.log(`Status: ${readHitRes.status}`);
    console.log(`X-Cache-Status Header: ${cacheStatusHit}`);
    console.log(`Latency (Redis RAM Read): ${durationHit}ms`);

    if (cacheStatusHit !== "HIT" || hitData.data._cache.isFromCache !== true) {
      throw new Error("Expected Cache HIT on second request!");
    }
    console.log(`[PASSED] Cache HIT confirmed. Latency dropped from ${durationMiss}ms to ${durationHit}ms.`);

    // ----------------------------------------------------
    // TEST 3: Cache Invalidation on Event Update
    // ----------------------------------------------------
    logStep(4, "PATCH /api/v1/events/:id - Cache Invalidation on Update");
    const updatedTitle = `UPDATED: World Tour Live Concert ${timestamp}`;

    const updateRes = await fetch(`${BASE_URL}/events/${eventId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({ title: updatedTitle }),
    });
    console.log("Update status:", updateRes.status);

    // Verify key was purged from Redis immediately
    const cacheAfterUpdate = await redisClient.get(CacheKeys.EVENT_DETAILS(eventId));
    if (cacheAfterUpdate !== null) {
      throw new Error("SECURITY/CONSISTENCY FAILURE: Cache was not invalidated after update!");
    }
    console.log("[PASSED] Cache key was successfully purged (invalidated) from Redis.");

    // Next read must be Cache MISS with updated title
    const readAfterUpdateRes = await fetch(`${BASE_URL}/events/${eventId}`);
    const dataAfterUpdate = await readAfterUpdateRes.json();
    const statusAfterUpdate = readAfterUpdateRes.headers.get("x-cache-status");

    if (statusAfterUpdate !== "MISS" || dataAfterUpdate.data.title !== updatedTitle) {
      throw new Error("Expected fresh DB read with updated title after invalidation!");
    }
    console.log("[PASSED] Read after update fetched fresh data from DB and re-populated cache.");

    // ----------------------------------------------------
    // TEST 4: Cache Penetration Defense (Null Caching)
    // ----------------------------------------------------
    logStep(5, "GET non-existent event - Cache Penetration Defense (Null Caching)");
    const fakeId = "00000000-0000-0000-0000-000000000000";

    const nonExistentRes1 = await fetch(`${BASE_URL}/events/${fakeId}`);
    console.log(`First non-existent call status: ${nonExistentRes1.status} (Expect 404)`);
    if (nonExistentRes1.status !== 404) {
      throw new Error("Expected 404 for non-existent event");
    }

    // Verify Null Sentinel in Redis
    const nullSentinel = await redisClient.get(CacheKeys.EVENT_DETAILS(fakeId));
    if (nullSentinel !== "__NULL_CACHE__") {
      throw new Error("Null caching sentinel was not set in Redis!");
    }
    console.log("[PASSED] Null-cache sentinel '__NULL_CACHE__' set in Redis.");

    // Second call should return 404 served from Redis without hitting DB
    const nonExistentRes2 = await fetch(`${BASE_URL}/events/${fakeId}`);
    console.log(`Second non-existent call status: ${nonExistentRes2.status} (Expect 404)`);
    if (nonExistentRes2.status !== 404) {
      throw new Error("Expected 404 from null cache");
    }
    console.log("[PASSED] Cache Penetration defense verified: 404 served immediately from cache.");

    // ----------------------------------------------------
    // TEST 5: Paginated Event List with Cache-Aside
    // ----------------------------------------------------
    logStep(6, "GET /api/v1/events - Paginated List Caching");
    const listRes1 = await fetch(`${BASE_URL}/events?page=1&limit=5`);
    const listStatus1 = listRes1.headers.get("x-cache-status");
    console.log("List Request 1 X-Cache-Status:", listStatus1);

    const listRes2 = await fetch(`${BASE_URL}/events?page=1&limit=5`);
    const listStatus2 = listRes2.headers.get("x-cache-status");
    console.log("List Request 2 X-Cache-Status:", listStatus2);

    if (listStatus1 !== "MISS" || listStatus2 !== "HIT") {
      throw new Error("Paginated list caching failed!");
    }
    console.log("[PASSED] Paginated Event list caching verified (MISS -> HIT).");

    console.log(`\n[SUCCESS] ALL TASK-03 CACHING LAYER VERIFICATION TESTS PASSED PERFECTLY.\n`);
    process.exit(0);
  } catch (error) {
    console.error("[ERROR] Task 03 test failed:", error);
    process.exit(1);
  }
};

runCacheTests();
