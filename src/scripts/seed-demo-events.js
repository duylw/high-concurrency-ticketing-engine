import { config } from "dotenv";
config();

import { prismaClient } from "../config/db.js";
import redisClient from "../config/redis.js";
import { CacheKeys } from "../constants/cacheKeys.js";

const seedDemoEvents = async () => {
  console.log(`\n======================================================`);
  console.log(`[SEED] Seeding realistic demo events for Customer Storefront...`);
  console.log(`======================================================`);

  try {
    // 1. Ensure organizer user exists
    let organizer = await prismaClient.user.findUnique({
      where: { email: "organizer@ticketing.com" },
    });

    if (!organizer) {
      console.log(`[SEED] organizer@ticketing.com not found, creating...`);
      organizer = await prismaClient.user.create({
        data: {
          email: "organizer@ticketing.com",
          username: "main_organizer",
          password: "hashedpassword123",
          name: "Concert Lead Organizer",
          role: "ORGANIZER",
          isActive: true,
        },
      });
    }

    const now = Date.now();

    const demoEventsData = [
      {
        title: "Sơn Tùng M-TP - Sky Tour Live 2026",
        description: "Đại nhạc hội đỉnh cao quy tụ dàn âm thanh ánh sáng chuẩn quốc tế tại Sân Vận Động Quốc Gia Mỹ Đình. Trải nghiệm không gian âm nhạc cuồng nhiệt cùng những bản hit đình đám.",
        bannerUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80",
        startTime: new Date(now + 30 * 86400000),
        endTime: new Date(now + 30 * 86400000 + 4 * 3600000),
        saleStartTime: new Date(now - 3600000), // Opened 1 hour ago (Active Flash-Sale)
        saleEndTime: new Date(now + 7 * 86400000),
        status: "PUBLISHED",
        organizerId: organizer.id,
        ticketTiers: [
          { name: "VVIP Diamond Zone", price: 2500000, totalStock: 50, availableStock: 42 },
          { name: "VIP Gold Seating", price: 1500000, totalStock: 100, availableStock: 85 },
          { name: "Standard GA Standing", price: 650000, totalStock: 300, availableStock: 260 },
        ],
      },
      {
        title: "Coldplay - Music of the Spheres Hanoi",
        description: "Chuyến lưu diễn toàn cầu Music of the Spheres chính thức đặt chân đến Hà Nội. Đắm chìm trong biển vòng tay phát sáng và những thông điệp bảo vệ hành tinh xanh.",
        bannerUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&auto=format&fit=crop&q=80",
        startTime: new Date(now + 45 * 86400000),
        endTime: new Date(now + 45 * 86400000 + 3 * 3600000),
        saleStartTime: new Date(now + 2 * 3600000 + 15 * 60000), // Opens in ~2 hours 15 mins (Countdown!)
        saleEndTime: new Date(now + 14 * 86400000),
        status: "PUBLISHED",
        organizerId: organizer.id,
        ticketTiers: [
          { name: "Infinity VIP Lounge", price: 3200000, totalStock: 30, availableStock: 30 },
          { name: "Cosmic Early Bird", price: 1200000, totalStock: 150, availableStock: 150 },
        ],
      },
      {
        title: "Anh Trai Say Hi - Mega Live Arena",
        description: "Sân khấu bùng nổ của 30 Anh Trai với những màn trình diễn vũ đạo và âm nhạc thăng hoa. Cơ hội săn vé cuối cùng cho những vị trí đẹp nhất sát sân khấu.",
        bannerUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80",
        startTime: new Date(now + 20 * 86400000),
        endTime: new Date(now + 20 * 86400000 + 4 * 3600000),
        saleStartTime: new Date(now - 7200000), // Opened 2 hours ago
        saleEndTime: new Date(now + 3 * 86400000),
        status: "PUBLISHED",
        organizerId: organizer.id,
        ticketTiers: [
          { name: "Say Hi Frontstage", price: 1800000, totalStock: 50, availableStock: 3 }, // Low stock < 10%
          { name: "Arena Tier 1 Seating", price: 850000, totalStock: 200, availableStock: 18 },
        ],
      },
    ];

    for (const data of demoEventsData) {
      const { ticketTiers, ...eventFields } = data;

      // Check if event with this title already exists
      let event = await prismaClient.event.findFirst({
        where: { title: eventFields.title },
      });

      if (!event) {
        event = await prismaClient.event.create({
          data: {
            ...eventFields,
            ticketTiers: {
              create: ticketTiers,
            },
          },
          include: { ticketTiers: true },
        });
        console.log(`[CREATED EVENT] ${event.title} (ID: ${event.id}) with ${event.ticketTiers.length} tiers`);
      } else {
        // Update existing event to active PUBLISHED status
        await prismaClient.event.update({
          where: { id: event.id },
          data: eventFields,
        });
        console.log(`[UPDATED EVENT] ${event.title} (ID: ${event.id})`);
      }
    }

    // 2. Invalidate Redis Cache so new events are immediately visible
    console.log(`[CACHE] Flushing Redis Event List Cache...`);
    const keys = await redisClient.keys("events:*");
    if (keys.length > 0) {
      await redisClient.del(...keys);
      console.log(`[CACHE] Cleared ${keys.length} cached event keys.`);
    }

    console.log(`\n[SUCCESS] Seeded demo events successfully! Ready for Customer Storefront.`);
    console.log(`======================================================\n`);
  } catch (error) {
    console.error(`[SEED ERROR]:`, error);
    process.exit(1);
  } finally {
    await prismaClient.$disconnect();
    await redisClient.quit();
  }
};

seedDemoEvents();
