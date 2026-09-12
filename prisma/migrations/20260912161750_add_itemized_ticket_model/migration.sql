-- CreateEnum
CREATE TYPE "TicketItemStatus" AS ENUM ('ISSUED', 'CHECKED_IN', 'REVOKED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'CHECKED_IN';
ALTER TYPE "OrderStatus" ADD VALUE 'PARTIALLY_CHECKED_IN';

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "sale_end_time" TIMESTAMP(3),
ADD COLUMN     "sale_start_time" TIMESTAMP(3),
ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'PUBLISHED';

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "ticket_tier_id" TEXT NOT NULL,
    "ticket_code" TEXT NOT NULL,
    "qr_payload" TEXT NOT NULL,
    "status" "TicketItemStatus" NOT NULL DEFAULT 'ISSUED',
    "checked_in_at" TIMESTAMP(3),
    "attendee_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_code_key" ON "tickets"("ticket_code");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ticket_tier_id_fkey" FOREIGN KEY ("ticket_tier_id") REFERENCES "ticket_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
