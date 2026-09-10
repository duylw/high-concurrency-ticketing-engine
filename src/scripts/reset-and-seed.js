import { config } from "dotenv";
config();

import { prismaClient } from "../config/db.js";
import { connectRedis, disconnectRedis, redisClient } from "../config/redis.js";
import { hashPassword } from "../utils/password.util.js";

const resetAndSeed = async () => {
  // ----------------------------------------------------
  // SAFETY GUARD 1: Block Production Environment
  // ----------------------------------------------------
  if (process.env.NODE_ENV === "production") {
    console.error(`\n======================================================`);
    console.error(`[CRITICAL SECURITY BLOCK] DANGEROUS OPERATION REFUSED!`);
    console.error(`'npm run db:reset' is STRICTLY FORBIDDEN in PRODUCTION!`);
    console.error(`NODE_ENV is set to 'production'. Process aborted immediately.`);
    console.error(`======================================================\n`);
    process.exit(1);
  }

  // ----------------------------------------------------
  // SAFETY GUARD 2: Remote / Cloud Database Guard
  // ----------------------------------------------------
  const dbUrl = process.env.DATABASE_URL || "";
  const isLocalDb = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") || dbUrl.includes("postgres:5432");
  if (!isLocalDb && process.env.ALLOW_REMOTE_RESET !== "true") {
    console.error(`\n======================================================`);
    console.error(`[SECURITY WARNING] REMOTE DATABASE DETECTED!`);
    console.error(`DATABASE_URL does not point to a local instance.`);
    console.error(`To protect cloud/staging data, set ALLOW_REMOTE_RESET=true to proceed.`);
    console.error(`======================================================\n`);
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`[RESET & SEED] Wiping All Database & Redis Data (LOCAL ONLY)...`);
  console.log(`======================================================`);

  try {
    // 1. Flush Redis Cache & Queues
    console.log(`[STEP 1] Flushing Redis (Cache, Locks & BullMQ)...`);
    await connectRedis();
    await redisClient.flushall();
    console.log(`[PASSED] Redis flushed clean (0 keys remaining).`);

    // 2. Truncate PostgreSQL Tables
    console.log(`[STEP 2] Truncating PostgreSQL tables (CASCADE)...`);
    await prismaClient.$executeRawUnsafe(`
      TRUNCATE TABLE "audit_logs", "orders", "ticket_tiers", "events", "refresh_tokens", "users" CASCADE;
    `);
    console.log(`[PASSED] PostgreSQL tables truncated clean.`);

    // 3. Seed Deterministic Users
    console.log(`[STEP 3] Seeding demo accounts for Postman testing...`);
    const passwordHash = await hashPassword("Password123!");

    const users = [
      {
        email: "organizer@ticketing.com",
        username: "main_organizer",
        name: "Concert Lead Organizer",
        role: "ORGANIZER",
      },
      {
        email: "competitor_organizer@ticketing.com",
        username: "competitor_organizer",
        name: "Competitor Organizer (Other Event)",
        role: "ORGANIZER",
      },
      {
        email: "buyer@ticketing.com",
        username: "ticket_buyer",
        name: "Main Ticket Buyer",
        role: "USER",
      },
    ];

    for (const u of users) {
      const created = await prismaClient.user.create({
        data: {
          email: u.email,
          username: u.username,
          password: passwordHash,
          name: u.name,
          role: u.role,
          isActive: true,
        },
      });
      console.log(`[USER CREATED] Role: ${u.role.padEnd(9)} | Email: ${u.email.padEnd(35)} | ID: ${created.id}`);
    }

    console.log(`\n======================================================`);
    console.log(`[SUCCESS] ALL DATA WIPED & DEMO ACCOUNTS SEEDED!`);
    console.log(`Password for all accounts: Password123!`);
    console.log(`Ready for Postman:`);
    console.log(`1. In Postman, clear any old Collection Variables (if saved).`);
    console.log(`2. Run request 1.1 (Login Organizer) and 1.2 (Login Customer).`);
    console.log(`======================================================\n`);
  } catch (error) {
    console.error(`\n[ERROR IN RESET & SEED]:`, error.message);
    process.exit(1);
  } finally {
    await disconnectRedis();
    await prismaClient.$disconnect();
  }
};

resetAndSeed();
