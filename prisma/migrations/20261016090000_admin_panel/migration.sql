-- CreateTable
CREATE TABLE "admin_records" (
    "id" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_records_collection_created_at_idx" ON "admin_records"("collection", "created_at");

-- Admin list screens filter and sort bookings, payments and refunds by date and status.
CREATE INDEX IF NOT EXISTS "bookings_created_at_idx" ON "bookings"("created_at");
CREATE INDEX IF NOT EXISTS "bookings_status_created_at_idx" ON "bookings"("status", "created_at");
CREATE INDEX IF NOT EXISTS "payments_created_at_idx" ON "payments"("created_at");
CREATE INDEX IF NOT EXISTS "refunds_created_at_idx" ON "refunds"("created_at");
