-- Add userId as nullable first
ALTER TABLE "Website"
ADD COLUMN "userId" TEXT;

-- Give existing test websites a temporary owner
UPDATE "Website"
SET "userId" = 'legacy-user';

-- Make userId required
ALTER TABLE "Website"
ALTER COLUMN "userId" SET NOT NULL;

-- Add index for ownership queries
CREATE INDEX "Website_userId_idx"
ON "Website"("userId");