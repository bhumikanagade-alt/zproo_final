-- Railway (train) bookings: reservations, passengers, cancellations, refunds and the development
-- provider's inventory. Additive only: no existing table or column is changed or dropped.
-- BookingStatus gains PROCESSING (paid, waiting for the railway to confirm the reservation).

-- CreateEnum
CREATE TYPE "TrainReservationStatus" AS ENUM ('PENDING', 'BOOKED', 'FAILED', 'CANCELLED', 'PARTIALLY_CANCELLED');

-- CreateEnum
CREATE TYPE "TrainPassengerStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RAC', 'WAITLIST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrainCancellationStatus" AS ENUM ('REQUESTED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'PROCESSING';

-- CreateTable
CREATE TABLE "train_inventory" (
    "id" TEXT NOT NULL,
    "train_number" TEXT NOT NULL,
    "run_date" DATE NOT NULL,
    "travel_class" TEXT NOT NULL,
    "quota" TEXT NOT NULL,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "train_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "train_bookings" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "train_number" TEXT NOT NULL,
    "train_name" TEXT NOT NULL,
    "from_station" TEXT NOT NULL,
    "to_station" TEXT NOT NULL,
    "journey_date" DATE NOT NULL,
    "departure_at" TIMESTAMP(3) NOT NULL,
    "arrival_at" TIMESTAMP(3) NOT NULL,
    "travel_class" TEXT NOT NULL,
    "quota" TEXT NOT NULL,
    "confirm_only" BOOLEAN NOT NULL DEFAULT false,
    "reservation_status" "TrainReservationStatus" NOT NULL DEFAULT 'PENDING',
    "pnr" TEXT,
    "provider_reference" TEXT,
    "chart_status" TEXT,
    "failure_reason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_checked_at" TIMESTAMP(3),
    "fare" JSONB NOT NULL,
    "offer" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "train_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "train_passengers" (
    "id" TEXT NOT NULL,
    "train_booking_id" TEXT NOT NULL,
    "booking_passenger_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "berth_preference" TEXT NOT NULL,
    "food_choice" TEXT,
    "status" "TrainPassengerStatus" NOT NULL DEFAULT 'PENDING',
    "booking_status" TEXT,
    "current_status" TEXT,
    "coach" TEXT,
    "berth" TEXT,
    "berth_type" TEXT,
    "fare_paise" INTEGER NOT NULL,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "train_passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "train_cancellations" (
    "id" TEXT NOT NULL,
    "train_booking_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "passenger_ids" TEXT[],
    "status" "TrainCancellationStatus" NOT NULL DEFAULT 'REQUESTED',
    "charges_paise" INTEGER NOT NULL,
    "refund_paise" INTEGER NOT NULL,
    "provider_cancellation_id" TEXT,
    "failure_reason" TEXT,
    "requested_by_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "train_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "gateway_refund_id" TEXT,
    "failure_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "train_inventory_train_number_run_date_travel_class_quota_key" ON "train_inventory"("train_number", "run_date", "travel_class", "quota");

-- CreateIndex
CREATE UNIQUE INDEX "train_bookings_booking_id_key" ON "train_bookings"("booking_id");

-- CreateIndex
CREATE INDEX "train_bookings_reservation_status_last_checked_at_idx" ON "train_bookings"("reservation_status", "last_checked_at");

-- CreateIndex
CREATE INDEX "train_bookings_train_number_journey_date_idx" ON "train_bookings"("train_number", "journey_date");

-- CreateIndex
CREATE UNIQUE INDEX "train_bookings_provider_pnr_key" ON "train_bookings"("provider", "pnr");

-- CreateIndex
CREATE UNIQUE INDEX "train_passengers_booking_passenger_id_key" ON "train_passengers"("booking_passenger_id");

-- CreateIndex
CREATE UNIQUE INDEX "train_passengers_train_booking_id_sequence_key" ON "train_passengers"("train_booking_id", "sequence");

-- CreateIndex
CREATE INDEX "train_cancellations_status_idx" ON "train_cancellations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "train_cancellations_train_booking_id_idempotency_key_key" ON "train_cancellations"("train_booking_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_idempotency_key_key" ON "refunds"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_gateway_refund_id_key" ON "refunds"("gateway_refund_id");

-- CreateIndex
CREATE INDEX "refunds_booking_id_idx" ON "refunds"("booking_id");

-- CreateIndex
CREATE INDEX "refunds_status_created_at_idx" ON "refunds"("status", "created_at");

-- AddForeignKey
ALTER TABLE "train_bookings" ADD CONSTRAINT "train_bookings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "train_passengers" ADD CONSTRAINT "train_passengers_train_booking_id_fkey" FOREIGN KEY ("train_booking_id") REFERENCES "train_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "train_passengers" ADD CONSTRAINT "train_passengers_booking_passenger_id_fkey" FOREIGN KEY ("booking_passenger_id") REFERENCES "booking_passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "train_cancellations" ADD CONSTRAINT "train_cancellations_train_booking_id_fkey" FOREIGN KEY ("train_booking_id") REFERENCES "train_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Class and quota are provider codes stored as text (class codes start with a digit, so they cannot
-- be Prisma enum values). Keep them to the known Indian Railways codes.
ALTER TABLE "train_bookings" ADD CONSTRAINT "train_bookings_travel_class_check"
  CHECK ("travel_class" IN ('1A', '2A', '3A', '3E', 'SL', 'CC', 'EC', '2S'));
ALTER TABLE "train_bookings" ADD CONSTRAINT "train_bookings_quota_check"
  CHECK ("quota" IN ('GN', 'TQ', 'LD', 'SS', 'PT'));
ALTER TABLE "train_inventory" ADD CONSTRAINT "train_inventory_sold_check" CHECK ("sold" >= 0);
ALTER TABLE "train_passengers" ADD CONSTRAINT "train_passengers_fare_check" CHECK ("fare_paise" >= 0);
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_amount_check" CHECK ("amount_paise" > 0);
