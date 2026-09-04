-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'MODERATOR', 'ORGANIZER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('AVAILABLE', 'HELD', 'SOLD');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "user_agent" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "banner_url" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "organizer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_tiers" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "total_stock" INTEGER NOT NULL,
    "available_stock" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ticket_tier_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_tiers" ADD CONSTRAINT "ticket_tiers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_ticket_tier_id_fkey" FOREIGN KEY ("ticket_tier_id") REFERENCES "ticket_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
