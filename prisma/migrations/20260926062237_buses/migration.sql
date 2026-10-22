-- CreateEnum
CREATE TYPE "BusType" AS ENUM ('SEATER', 'SLEEPER', 'SEATER_SLEEPER');

-- CreateEnum
CREATE TYPE "BusDeck" AS ENUM ('LOWER', 'UPPER');

-- CreateEnum
CREATE TYPE "BusSeatKind" AS ENUM ('SEATER', 'SLEEPER');

-- CreateEnum
CREATE TYPE "BusPointKind" AS ENUM ('BOARDING', 'DROPPING');

-- AlterTable
ALTER TABLE "booking_passengers" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "seat_number" TEXT;

-- CreateTable
CREATE TABLE "bus_operators" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "rating_count" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bus_operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buses" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BusType" NOT NULL,
    "ac" BOOLEAN NOT NULL,
    "electric" BOOLEAN NOT NULL DEFAULT false,
    "amenities" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus_seats" (
    "id" TEXT NOT NULL,
    "bus_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "deck" "BusDeck" NOT NULL,
    "row" INTEGER NOT NULL,
    "column" INTEGER NOT NULL,
    "kind" "BusSeatKind" NOT NULL,
    "fare_percent" INTEGER NOT NULL DEFAULT 100,
    "ladies_only" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "bus_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus_routes" (
    "id" TEXT NOT NULL,
    "origin_city" TEXT NOT NULL,
    "destination_city" TEXT NOT NULL,
    "distance_km" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bus_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus_route_points" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "kind" "BusPointKind" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "offset_minutes" INTEGER NOT NULL,

    CONSTRAINT "bus_route_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus_schedules" (
    "id" TEXT NOT NULL,
    "bus_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "service_number" TEXT NOT NULL,
    "departure_time" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "days_of_week" INTEGER[],
    "base_fare_paise" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bus_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus_trips" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "bus_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus_seat_bookings" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "seat_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bus_seat_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus_bookings" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "trip_id" TEXT,
    "operator_name" TEXT NOT NULL,
    "origin_city" TEXT NOT NULL,
    "destination_city" TEXT NOT NULL,
    "departure_at" TIMESTAMP(3) NOT NULL,
    "arrival_at" TIMESTAMP(3) NOT NULL,
    "seat_numbers" TEXT[],
    "boarding_point" JSONB NOT NULL,
    "dropping_point" JSONB NOT NULL,
    "offer" JSONB NOT NULL,
    "pnr" TEXT,

    CONSTRAINT "bus_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bus_operators_code_key" ON "bus_operators"("code");

-- CreateIndex
CREATE UNIQUE INDEX "buses_operator_id_code_key" ON "buses"("operator_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "bus_seats_bus_id_number_key" ON "bus_seats"("bus_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "bus_routes_origin_city_destination_city_key" ON "bus_routes"("origin_city", "destination_city");

-- CreateIndex
CREATE UNIQUE INDEX "bus_route_points_route_id_kind_sequence_key" ON "bus_route_points"("route_id", "kind", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "bus_schedules_service_number_key" ON "bus_schedules"("service_number");

-- CreateIndex
CREATE INDEX "bus_schedules_route_id_active_idx" ON "bus_schedules"("route_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "bus_trips_schedule_id_date_key" ON "bus_trips"("schedule_id", "date");

-- CreateIndex
CREATE INDEX "bus_seat_bookings_booking_id_idx" ON "bus_seat_bookings"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "bus_seat_bookings_trip_id_seat_id_key" ON "bus_seat_bookings"("trip_id", "seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "bus_bookings_booking_id_key" ON "bus_bookings"("booking_id");

-- CreateIndex
CREATE INDEX "bus_bookings_trip_id_idx" ON "bus_bookings"("trip_id");

-- AddForeignKey
ALTER TABLE "buses" ADD CONSTRAINT "buses_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "bus_operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_seats" ADD CONSTRAINT "bus_seats_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "buses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_route_points" ADD CONSTRAINT "bus_route_points_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "bus_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_schedules" ADD CONSTRAINT "bus_schedules_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "buses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_schedules" ADD CONSTRAINT "bus_schedules_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "bus_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_trips" ADD CONSTRAINT "bus_trips_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "bus_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_seat_bookings" ADD CONSTRAINT "bus_seat_bookings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "bus_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_seat_bookings" ADD CONSTRAINT "bus_seat_bookings_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "bus_seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_seat_bookings" ADD CONSTRAINT "bus_seat_bookings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_bookings" ADD CONSTRAINT "bus_bookings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
