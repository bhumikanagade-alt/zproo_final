-- Admin panel fixes.

-- 1. Refunds: record who raised a refund and the reference when finance settles one by hand.
ALTER TABLE "refunds" ADD COLUMN "settlement_reference" TEXT;
ALTER TABLE "refunds" ADD COLUMN "requested_by_id" TEXT;

-- 2. A real wallet per customer, with a ledger.
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance_paise" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wallets_balance_not_negative" CHECK ("balance_paise" >= 0)
);

CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "balance_after_paise" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");
CREATE UNIQUE INDEX "wallet_transactions_idempotency_key_key" ON "wallet_transactions"("idempotency_key");
CREATE INDEX "wallet_transactions_wallet_id_created_at_idx" ON "wallet_transactions"("wallet_id", "created_at");
CREATE INDEX "wallet_transactions_created_at_idx" ON "wallet_transactions"("created_at");

ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Panel records stored as JSON: database-level rules so two admins cannot create the same coupon,
--    plus indexes for the fields the panel filters on.
CREATE UNIQUE INDEX IF NOT EXISTS "admin_coupon_code_uq"
    ON "admin_records" ((data->>'code')) WHERE collection = 'coupons';
CREATE INDEX IF NOT EXISTS "admin_records_status_idx"
    ON "admin_records" (collection, (data->>'status'));

-- Support ticket numbers come from a sequence (never repeated, even after deletes or concurrent creates).
CREATE SEQUENCE IF NOT EXISTS "admin_ticket_number_seq" START WITH 1041 MINVALUE 1041;
-- Continue after the highest ticket number already issued (earlier numbers were ZT-1041 + row count).
SELECT setval(
  'admin_ticket_number_seq',
  GREATEST(1041, COALESCE((
    SELECT MAX(NULLIF(regexp_replace(data->>'number', '[^0-9]', '', 'g'), '')::int)
    FROM "admin_records" WHERE collection = 'tickets'
  ), 1040) + 1),
  false
);

-- 4. Faster admin search (substring and case-insensitive matches). Skipped quietly where the
--    pg_trgm extension cannot be created.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS "bookings_reference_trgm_idx" ON "bookings" USING gin ("reference" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "bookings_contact_email_trgm_idx" ON "bookings" USING gin ("contact_email" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "users_full_name_trgm_idx" ON "users" USING gin ("full_name" gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm search indexes skipped: %', SQLERRM;
END $$;

-- 5. Coupons created in the admin panel are applied at checkout; every use is recorded here.
CREATE TABLE "coupon_redemptions" (
    "id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "coupon_redemptions_booking_id_code_key" ON "coupon_redemptions"("booking_id", "code");
CREATE INDEX "coupon_redemptions_coupon_id_user_id_idx" ON "coupon_redemptions"("coupon_id", "user_id");
