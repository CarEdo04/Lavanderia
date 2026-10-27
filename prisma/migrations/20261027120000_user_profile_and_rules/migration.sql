-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "rulesText" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" DATETIME,
    "verificationSentAt" DATETIME,
    "username" TEXT,
    "passwordHash" TEXT NOT NULL,
    "room" TEXT,
    "rulesAcceptedAt" DATETIME,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Existing users keep their full name as first name and their apartment as
-- room. They registered before email verification existed, so they count
-- as verified.
INSERT INTO "new_User" ("id", "firstName", "lastName", "email", "emailVerifiedAt", "passwordHash", "room", "role", "createdAt")
SELECT "id", "name", '', "email", "createdAt", "passwordHash", "apartment", "role", "createdAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
