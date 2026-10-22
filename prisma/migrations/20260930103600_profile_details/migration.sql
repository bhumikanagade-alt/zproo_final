-- Add optional profile details and persistent avatar data.
ALTER TABLE "users"
  ADD COLUMN "date_of_birth" DATE,
  ADD COLUMN "gender" "Gender",
  ADD COLUMN "state" TEXT;
