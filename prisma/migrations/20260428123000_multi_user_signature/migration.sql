PRAGMA foreign_keys=OFF;

INSERT OR IGNORE INTO "User" ("id", "email", "password", "createdAt")
SELECT 'legacy-user', 'legacy@example.local', '', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User")
  AND (
    EXISTS (SELECT 1 FROM "BusinessProfile")
    OR EXISTS (SELECT 1 FROM "Customer")
    OR EXISTS (SELECT 1 FROM "BotFile")
    OR EXISTS (SELECT 1 FROM "Invoice")
  );

CREATE TABLE "new_BusinessProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "logoPath" TEXT,
    "signaturePath" TEXT,
    "signatureName" TEXT,
    "website" TEXT,
    "email" TEXT,
    "address" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpFromName" TEXT,
    CONSTRAINT "BusinessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_BusinessProfile" (
    "id",
    "userId",
    "businessName",
    "logoPath",
    "website",
    "email",
    "address",
    "smtpHost",
    "smtpPort",
    "smtpUser",
    "smtpPass",
    "smtpFromName"
)
SELECT
    "id",
    COALESCE((SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1), 'legacy-user'),
    "businessName",
    "logoPath",
    "website",
    "email",
    "address",
    "smtpHost",
    "smtpPort",
    "smtpUser",
    "smtpPass",
    "smtpFromName"
FROM "BusinessProfile";

DROP TABLE "BusinessProfile";
ALTER TABLE "new_BusinessProfile" RENAME TO "BusinessProfile";
CREATE UNIQUE INDEX "BusinessProfile_userId_key" ON "BusinessProfile"("userId");

CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "pincode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Customer" (
    "id",
    "userId",
    "name",
    "email",
    "phone",
    "address",
    "city",
    "state",
    "country",
    "pincode",
    "createdAt"
)
SELECT
    "id",
    COALESCE((SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1), 'legacy-user'),
    "name",
    "email",
    "phone",
    "address",
    "city",
    "state",
    "country",
    "pincode",
    "createdAt"
FROM "Customer";

DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_userId_idx" ON "Customer"("userId");

CREATE TABLE "new_BotFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BotFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_BotFile" (
    "id",
    "userId",
    "fileName",
    "filePath",
    "fileSize",
    "uploadedAt"
)
SELECT
    "id",
    COALESCE((SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1), 'legacy-user'),
    "fileName",
    "filePath",
    "fileSize",
    "uploadedAt"
FROM "BotFile";

DROP TABLE "BotFile";
ALTER TABLE "new_BotFile" RENAME TO "BotFile";
CREATE INDEX "BotFile_userId_idx" ON "BotFile"("userId");

CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "services" TEXT,
    "validity" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'paid',
    "botFileId" TEXT,
    "signaturePath" TEXT,
    "signatureName" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_botFileId_fkey" FOREIGN KEY ("botFileId") REFERENCES "BotFile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Invoice" (
    "id",
    "userId",
    "invoiceNumber",
    "date",
    "customerId",
    "productName",
    "services",
    "validity",
    "amount",
    "currency",
    "status",
    "botFileId",
    "sentAt",
    "createdAt"
)
SELECT
    "id",
    COALESCE((SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1), 'legacy-user'),
    "invoiceNumber",
    "date",
    "customerId",
    "productName",
    "services",
    "validity",
    "amount",
    "currency",
    "status",
    "botFileId",
    "sentAt",
    "createdAt"
FROM "Invoice";

DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_userId_invoiceNumber_key" ON "Invoice"("userId", "invoiceNumber");
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

PRAGMA foreign_keys=ON;
