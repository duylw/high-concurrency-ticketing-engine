import { config } from "dotenv";
config();

import { connectDB, disconnectDB, prismaClient } from "../config/db.js";
import { connectRedis, disconnectRedis, redisClient } from "../config/redis.js";

const logStep = (step, title) => {
  console.log(`\n======================================================`);
  console.log(`[INFRA STEP ${step}] ${title}`);
  console.log(`======================================================`);
};

const runInfraTest = async () => {
  try {
    // ----------------------------------------------------
    // TEST 1: PostgreSQL Connection & Query
    // ----------------------------------------------------
    logStep(1, "PostgreSQL Connectivity & Health Check");
    await connectDB();
    const dbResult = await prismaClient.$queryRaw`SELECT 1 + 1 AS sum, current_database() as db_name, version()`;
    console.log("Database Query Output:", dbResult);
    if (!dbResult || Number(dbResult[0].sum) !== 2) {
      throw new Error("PostgreSQL query calculation failed!");
    }
    console.log(`[PASSED] Connected to PostgreSQL [DB: ${dbResult[0].db_name}] successfully.`);

    // ----------------------------------------------------
    // TEST 2: Prisma Models Verification
    // ----------------------------------------------------
    logStep(2, "Prisma Schema Models Verification");
    const userCount = await prismaClient.user.count();
    const eventCount = await prismaClient.event.count();
    const tierCount = await prismaClient.ticketTier.count();
    const orderCount = await prismaClient.order.count();
    const auditCount = await prismaClient.auditLog.count();

    console.log({
      users: userCount,
      events: eventCount,
      ticketTiers: tierCount,
      orders: orderCount,
      auditLogs: auditCount,
    });
    console.log("[PASSED] All Prisma Tables and Relationships are accessible.");

    // ----------------------------------------------------
    // TEST 3: Redis Connection & Ping
    // ----------------------------------------------------
    logStep(3, "Redis Connectivity & Ping");
    await connectRedis();
    const pingResponse = await redisClient.ping();
    if (pingResponse !== "PONG") {
      throw new Error(`Redis ping expected 'PONG', got: ${pingResponse}`);
    }
    console.log("[PASSED] Redis Ping Response: PONG");

    // ----------------------------------------------------
    // TEST 4: Redis Read/Write/Delete Operations
    // ----------------------------------------------------
    logStep(4, "Redis Read / Write / TTL / Delete Operations");
    const testKey = "test:infra:ping";
    const testValue = `test_val_${Date.now()}`;

    await redisClient.set(testKey, testValue, "EX", 10);
    const retrieved = await redisClient.get(testKey);
    const ttl = await redisClient.ttl(testKey);

    if (retrieved !== testValue || ttl <= 0) {
      throw new Error(`Redis SET/GET failed! Expected ${testValue}, got ${retrieved}`);
    }
    console.log(`[PASSED] Redis SET/GET with TTL verified. Value: ${retrieved} (TTL: ${ttl}s)`);

    await redisClient.del(testKey);
    const afterDel = await redisClient.get(testKey);
    if (afterDel !== null) {
      throw new Error("Redis DEL failed!");
    }
    console.log("[PASSED] Redis DEL operation verified.");

    // ----------------------------------------------------
    // CLEANUP & SHUTDOWN
    // ----------------------------------------------------
    logStep(5, "Clean Shutdown");
    await disconnectDB();
    await disconnectRedis();
    console.log(`\n[SUCCESS] ALL INFRASTRUCTURE CHECKS PASSED PERFECTLY.\n`);
    process.exit(0);
  } catch (error) {
    console.error("[ERROR] Infrastructure test failed:", error);
    process.exit(1);
  }
};

runInfraTest();
