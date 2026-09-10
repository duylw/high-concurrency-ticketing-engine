import { config } from "dotenv";
config();

import { prismaClient } from "../config/db.js";
import { hashPassword } from "../utils/password.util.js";

const seedDemoUsers = async () => {
  console.log(`\n[SEED] Seeding deterministic demo accounts for Postman & Manual Testing...`);

  try {
    const passwordHash = await hashPassword("Password123!");

    const usersToSeed = [
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

    for (const u of usersToSeed) {
      const user = await prismaClient.user.upsert({
        where: { email: u.email },
        update: {
          username: u.username,
          password: passwordHash,
          name: u.name,
          role: u.role,
          isActive: true,
        },
        create: {
          email: u.email,
          username: u.username,
          password: passwordHash,
          name: u.name,
          role: u.role,
          isActive: true,
        },
      });

      console.log(`[SEED SUCCESS] ${u.role.padEnd(9)} | Email: ${u.email.padEnd(35)} | ID: ${user.id}`);
    }

    console.log(`\n[INFO] All demo accounts have password: Password123!`);
    console.log(`[SEED COMPLETED] Ready for Postman & Manual Testing!\n`);
  } catch (error) {
    console.error(`[SEED ERROR]:`, error.message);
    process.exit(1);
  } finally {
    await prismaClient.$disconnect();
  }
};

seedDemoUsers();
