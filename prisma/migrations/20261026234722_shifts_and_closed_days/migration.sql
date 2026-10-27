-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "slotMinutes" INTEGER NOT NULL DEFAULT 240,
    "openHour" INTEGER NOT NULL DEFAULT 8,
    "closeHour" INTEGER NOT NULL DEFAULT 24,
    "closedWeekdays" TEXT NOT NULL DEFAULT '0',
    "maxActiveBookings" INTEGER NOT NULL DEFAULT 3,
    "maxDaysAhead" INTEGER NOT NULL DEFAULT 7,
    "registrationCode" TEXT
);
INSERT INTO "new_Settings" ("closeHour", "id", "maxActiveBookings", "maxDaysAhead", "openHour", "registrationCode", "slotMinutes") SELECT "closeHour", "id", "maxActiveBookings", "maxDaysAhead", "openHour", "registrationCode", "slotMinutes" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
