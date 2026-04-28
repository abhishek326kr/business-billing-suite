INSERT INTO "User" ("id", "email", "password", "createdAt")
SELECT 'legacy-user', 'legacy@example.local', '', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User")
  AND (
    EXISTS (SELECT 1 FROM "BusinessProfile")
    OR EXISTS (SELECT 1 FROM "Customer")
    OR EXISTS (SELECT 1 FROM "BotFile")
    OR EXISTS (SELECT 1 FROM "Invoice")
  )
ON CONFLICT DO NOTHING;

ALTER TABLE "BusinessProfile" ADD COLUMN "userId" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN "signaturePath" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN "signatureName" TEXT;
UPDATE "BusinessProfile"
SET "userId" = COALESCE((SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1), 'legacy-user')
WHERE "userId" IS NULL;
ALTER TABLE "BusinessProfile" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "BusinessProfile_userId_key" ON "BusinessProfile"("userId");

ALTER TABLE "Customer" ADD COLUMN "userId" TEXT;
UPDATE "Customer"
SET "userId" = COALESCE((SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1), 'legacy-user')
WHERE "userId" IS NULL;
ALTER TABLE "Customer" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Customer_userId_idx" ON "Customer"("userId");

ALTER TABLE "BotFile" ADD COLUMN "userId" TEXT;
UPDATE "BotFile"
SET "userId" = COALESCE((SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1), 'legacy-user')
WHERE "userId" IS NULL;
ALTER TABLE "BotFile" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "BotFile" ADD CONSTRAINT "BotFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "BotFile_userId_idx" ON "BotFile"("userId");

ALTER TABLE "Invoice" ADD COLUMN "userId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "signaturePath" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "signatureName" TEXT;
UPDATE "Invoice"
SET "userId" = COALESCE((SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1), 'legacy-user')
WHERE "userId" IS NULL;
ALTER TABLE "Invoice" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX "Invoice_invoiceNumber_key";
CREATE UNIQUE INDEX "Invoice_userId_invoiceNumber_key" ON "Invoice"("userId", "invoiceNumber");
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");
