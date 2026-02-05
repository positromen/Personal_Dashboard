/*
  Warnings:

  - You are about to drop the column `convertedProjectId` on the `Hackathon` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `Hackathon` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Hackathon` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Hackathon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "organizer" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'online',
    "theme" TEXT,
    "teamSize" INTEGER NOT NULL DEFAULT 1,
    "registrationDeadline" DATETIME,
    "submissionDeadline" DATETIME,
    "eventStartDate" DATETIME,
    "eventEndDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Hackathon" ("createdAt", "id", "mode", "name", "organizer", "registrationDeadline", "status", "submissionDeadline", "teamSize", "theme", "updatedAt") SELECT "createdAt", "id", "mode", "name", "organizer", "registrationDeadline", "status", "submissionDeadline", "teamSize", "theme", "updatedAt" FROM "Hackathon";
DROP TABLE "Hackathon";
ALTER TABLE "new_Hackathon" RENAME TO "Hackathon";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
