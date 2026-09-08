import { config } from "dotenv";
config();

import autocannon from "autocannon";
import { prismaClient } from "../config/db.js";
import { redisClient } from "../config/redis.js";
import { CacheKeys } from "../constants/cacheKeys.js";

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

const logHeader = (title) => {
    console.log(`\n======================================================`);
    console.log(title);
    console.log(`======================================================`);
};

const runReadBenchmark = async () => {
    const timestamp = Date.now();
    let organizerId = "";
    let eventId = "";

    try {
        logHeader("[BENCHMARK-READ] STEP 1: Setting up Test Event");

        // 1. Create Organizer
        const organizer = await prismaClient.user.create({
            data: {
                email: `organizer_bench_read_${timestamp}@example.com`,
                username: `organizer_bench_read_${timestamp}`,
                password: "hashedpassword123",
                name: "Benchmark Organizer",
                role: "ORGANIZER",
            },
        });
        organizerId = organizer.id;

        // 2. Create Event
        const event = await prismaClient.event.create({
            data: {
                title: `Read Benchmark Event ${timestamp}`,
                description: "Event dedicated for benchmarking read path throughput.",
                startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
                organizerId,
                ticketTiers: {
                    create: [
                        { name: "Standard Tier", price: 100, totalStock: 1000, availableStock: 1000 },
                        { name: "VIP Tier", price: 250, totalStock: 200, availableStock: 200 },
                    ],
                },
            },
        });
        eventId = event.id;
        console.log(`[SETUP] Event created: ID = ${eventId}`);

        // ----------------------------------------------------
        // PHASE 1: DIRECT DATABASE QUERY VIA HTTP (CACHE MISSES)
        // ----------------------------------------------------
        logHeader("[BENCHMARK-READ] PHASE 1: Direct PostgreSQL Query via HTTP (Continuous Cache Invalidation)");
        console.log(`[INFO] Benchmarking HTTP GET /events/:id with Redis cache invalidated on-the-fly (forcing PostgreSQL query)...`);

        const cacheKey = CacheKeys.EVENT_DETAILS(eventId);
        // Continuously purge the cache key to force Prisma PostgreSQL query
        const invalidator = setInterval(() => {
            redisClient.del(cacheKey).catch(() => {});
        }, 5);

        const dbHttpResult = await autocannon({
            url: `${BASE_URL}/events/${eventId}`,
            connections: 50,
            duration: 8,
            pipelining: 1,
        });
        clearInterval(invalidator);

        const dbRps = Math.round(dbHttpResult.requests.average);
        const dbP50 = dbHttpResult.latency.p50;
        const dbP95 = dbHttpResult.latency.p95 || dbHttpResult.latency.p90;
        const dbP99 = dbHttpResult.latency.p99;
        const dbAvg = dbHttpResult.latency.average.toFixed(2);

        console.log(`[DIRECT DB HTTP RESULT] Throughput:  ${dbRps} RPS`);
        console.log(`[DIRECT DB HTTP RESULT] Latency Avg: ${dbAvg} ms | p50: ${dbP50} ms | p99: ${dbP99} ms`);

        // Pause 2 seconds to allow OS sockets to recycle
        console.log(`[INFO] Cooling down for 2 seconds...`);
        await new Promise((r) => setTimeout(r, 2000));

        // ----------------------------------------------------
        // PHASE 2: REDIS CACHE HIT BENCHMARK (AUTOCANNON)
        // ----------------------------------------------------
        logHeader("[BENCHMARK-READ] PHASE 2: Redis Cache-Aside Throughput (Pure In-Memory HIT)");

        // Warm up the cache with 1 initial request
        const warmupRes = await fetch(`${BASE_URL}/events/${eventId}`);
        const warmupData = await warmupRes.json();
        console.log(`[WARMUP] Cache pre-warmed. Status: ${warmupRes.status}, Cache Header: ${warmupRes.headers.get("x-cache-status")}`);

        console.log(`[INFO] Starting Autocannon: 50 concurrent connections, 10s duration...`);
        const autocannonResult = await autocannon({
            url: `${BASE_URL}/events/${eventId}`,
            connections: 50,
            duration: 10,
            pipelining: 1,
        });

        // Print raw autocannon result table
        console.log(`\n` + autocannon.printResult(autocannonResult));

        const redisRps = Math.round(autocannonResult.requests.average);
        const redisP50 = autocannonResult.latency.p50;
        const redisP95 = autocannonResult.latency.p95 || autocannonResult.latency.p90;
        const redisP99 = autocannonResult.latency.p99;
        const redisAvg = autocannonResult.latency.average.toFixed(2);

        // ----------------------------------------------------
        // PHASE 3: COMPARISON REPORT
        // ----------------------------------------------------
        logHeader("[BENCHMARK-READ] SUMMARY COMPARISON REPORT");

        const speedup = (redisRps / dbRps).toFixed(1);
        const latencyDiff = (dbAvg - redisAvg).toFixed(1);

        console.log(`
+------------------------------------------------------------------------+
|                      READ PATH PERFORMANCE COMPARISON                  |
+------------------------------------------------------------------------+
| Metric                 | Direct DB (Cache Miss)  | Redis Cache (Cache Hit) |
+------------------------+-------------------------+-------------------------+
| Throughput (RPS)       | ${String(dbRps).padEnd(23)} | ${String(redisRps).padEnd(23)} |
| Average Latency        | ${(dbAvg + " ms").padEnd(23)} | ${(redisAvg + " ms").padEnd(23)} |
| Latency p50 (Median)   | ${(dbP50 + " ms").padEnd(23)} | ${(redisP50 + " ms").padEnd(23)} |
| Latency p95            | ${(dbP95 + " ms").padEnd(23)} | ${(redisP95 + " ms").padEnd(23)} |
| Latency p99            | ${(dbP99 + " ms").padEnd(23)} | ${(redisP99 + " ms").padEnd(23)} |
| Concurrency Level      | 50 connections          | 100 connections         |
+------------------------+-------------------------+-------------------------+
[KEY TAKEAWAY]: Redis Cache provides ~${speedup}x higher throughput over HTTP.
`);

    } catch (error) {
        console.error("[BENCHMARK-READ ERROR]", error);
    } finally {
        // Cleanup test data
        logHeader("[BENCHMARK-READ] STEP 3: Cleanup");
        if (eventId) {
            await redisClient.del(CacheKeys.EVENT_DETAILS(eventId));
            await prismaClient.ticketTier.deleteMany({ where: { eventId } });
            await prismaClient.event.deleteMany({ where: { id: eventId } });
            console.log(`[CLEANUP] Deleted test event ${eventId}`);
        }
        if (organizerId) {
            await prismaClient.user.deleteMany({ where: { id: organizerId } });
            console.log(`[CLEANUP] Deleted test organizer ${organizerId}`);
        }
        await prismaClient.$disconnect();
        redisClient.disconnect();
    }
};

runReadBenchmark();
