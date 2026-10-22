-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('FLIGHT', 'BUS', 'TRAIN', 'HOTEL', 'CAB', 'BIKE', 'HOLIDAY', 'PARCEL', 'CORPORATE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('INITIATED', 'PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'AUTHORIZED', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CabinClass" AS ENUM ('ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST');

-- CreateEnum
CREATE TYPE "PassengerType" AS ENUM ('ADULT', 'CHILD', 'INFANT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "airlines" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "airlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airports" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "airports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flights" (
    "id" TEXT NOT NULL,
    "airline_id" TEXT NOT NULL,
    "flight_number" TEXT NOT NULL,
    "origin_id" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "days_of_week" INTEGER[],
    "base_fare_paise" INTEGER NOT NULL,
    "seats_economy" INTEGER NOT NULL,
    "seats_premium" INTEGER NOT NULL DEFAULT 0,
    "seats_business" INTEGER NOT NULL DEFAULT 0,
    "seats_first" INTEGER NOT NULL DEFAULT 0,
    "aircraft" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_segments" (
    "id" TEXT NOT NULL,
    "flight_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "airline_id" TEXT NOT NULL,
    "flight_number" TEXT NOT NULL,
    "origin_id" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "departure_time" TEXT NOT NULL,
    "day_offset" INTEGER NOT NULL DEFAULT 0,
    "duration_minutes" INTEGER NOT NULL,

    CONSTRAINT "flight_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_inventory" (
    "id" TEXT NOT NULL,
    "flight_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "cabin" "CabinClass" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "sold" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "flight_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'INITIATED',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "base_amount_paise" INTEGER NOT NULL,
    "tax_amount_paise" INTEGER NOT NULL,
    "fee_amount_paise" INTEGER NOT NULL DEFAULT 0,
    "discount_amount_paise" INTEGER NOT NULL DEFAULT 0,
    "total_amount_paise" INTEGER NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "travel_date" DATE NOT NULL,
    "hold_expires_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "idempotency_key" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_passengers" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" "PassengerType" NOT NULL,
    "title" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" DATE,
    "gender" "Gender" NOT NULL,

    CONSTRAINT "booking_passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_bookings" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "flight_id" TEXT,
    "service_date" DATE,
    "cabin" "CabinClass" NOT NULL,
    "seats" INTEGER NOT NULL,
    "origin_code" TEXT NOT NULL,
    "destination_code" TEXT NOT NULL,
    "departure_at" TIMESTAMP(3) NOT NULL,
    "arrival_at" TIMESTAMP(3) NOT NULL,
    "offer" JSONB NOT NULL,
    "pnr" TEXT,
    "tickets" JSONB,

    CONSTRAINT "flight_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_order_id" TEXT NOT NULL,
    "provider_payment_id" TEXT,
    "amount_paise" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "method" TEXT,
    "failure_reason" TEXT,
    "captured_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "airlines_code_key" ON "airlines"("code");

-- CreateIndex
CREATE UNIQUE INDEX "airports_code_key" ON "airports"("code");

-- CreateIndex
CREATE INDEX "flights_origin_id_destination_id_active_idx" ON "flights"("origin_id", "destination_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "flights_airline_id_flight_number_key" ON "flights"("airline_id", "flight_number");

-- CreateIndex
CREATE UNIQUE INDEX "flight_segments_flight_id_sequence_key" ON "flight_segments"("flight_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "flight_inventory_flight_id_date_cabin_key" ON "flight_inventory"("flight_id", "date", "cabin");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings"("reference");

-- CreateIndex
CREATE INDEX "bookings_user_id_created_at_idx" ON "bookings"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "bookings_status_hold_expires_at_idx" ON "bookings"("status", "hold_expires_at");

-- CreateIndex
CREATE INDEX "bookings_service_type_travel_date_idx" ON "bookings"("service_type", "travel_date");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_user_id_idempotency_key_key" ON "bookings"("user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "booking_passengers_booking_id_sequence_key" ON "booking_passengers"("booking_id", "sequence");

-- CreateIndex
CREATE INDEX "flight_bookings_flight_id_service_date_idx" ON "flight_bookings"("flight_id", "service_date");

-- CreateIndex
CREATE UNIQUE INDEX "flight_bookings_booking_id_sequence_key" ON "flight_bookings"("booking_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_order_id_key" ON "payments"("provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_payment_id_key" ON "payments"("provider_payment_id");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "payments_user_id_created_at_idx" ON "payments"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_airline_id_fkey" FOREIGN KEY ("airline_id") REFERENCES "airlines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_origin_id_fkey" FOREIGN KEY ("origin_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_segments" ADD CONSTRAINT "flight_segments_flight_id_fkey" FOREIGN KEY ("flight_id") REFERENCES "flights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_segments" ADD CONSTRAINT "flight_segments_airline_id_fkey" FOREIGN KEY ("airline_id") REFERENCES "airlines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_segments" ADD CONSTRAINT "flight_segments_origin_id_fkey" FOREIGN KEY ("origin_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_segments" ADD CONSTRAINT "flight_segments_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_inventory" ADD CONSTRAINT "flight_inventory_flight_id_fkey" FOREIGN KEY ("flight_id") REFERENCES "flights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_passengers" ADD CONSTRAINT "booking_passengers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_bookings" ADD CONSTRAINT "flight_bookings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
