/*
  Warnings:

  - You are about to drop the column `FEN` on the `Puzzle` table. All the data in the column will be lost.
  - You are about to drop the column `GameUrl` on the `Puzzle` table. All the data in the column will be lost.
  - You are about to drop the column `Moves` on the `Puzzle` table. All the data in the column will be lost.
  - You are about to drop the column `NbPlays` on the `Puzzle` table. All the data in the column will be lost.
  - You are about to drop the column `OpeningTags` on the `Puzzle` table. All the data in the column will be lost.
  - You are about to drop the column `Popularity` on the `Puzzle` table. All the data in the column will be lost.
  - You are about to drop the column `PuzzleId` on the `Puzzle` table. All the data in the column will be lost.
  - You are about to drop the column `Rating` on the `Puzzle` table. All the data in the column will be lost.
  - You are about to drop the column `RatingDeviation` on the `Puzzle` table. All the data in the column will be lost.
  - You are about to drop the column `Themes` on the `Puzzle` table. All the data in the column will be lost.
  - Added the required column `fen` to the `Puzzle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gameUrl` to the `Puzzle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `moves` to the `Puzzle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nbPlays` to the `Puzzle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `openingTags` to the `Puzzle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `popularity` to the `Puzzle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `puzzleId` to the `Puzzle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rating` to the `Puzzle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ratingDeviation` to the `Puzzle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `themes` to the `Puzzle` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Puzzle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "puzzleId" TEXT NOT NULL,
    "fen" TEXT NOT NULL,
    "moves" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "ratingDeviation" INTEGER NOT NULL,
    "popularity" INTEGER NOT NULL,
    "nbPlays" INTEGER NOT NULL,
    "themes" TEXT NOT NULL,
    "gameUrl" TEXT NOT NULL,
    "openingTags" TEXT NOT NULL
);
INSERT INTO "new_Puzzle" ("id") SELECT "id" FROM "Puzzle";
DROP TABLE "Puzzle";
ALTER TABLE "new_Puzzle" RENAME TO "Puzzle";
CREATE UNIQUE INDEX "Puzzle_puzzleId_key" ON "Puzzle"("puzzleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
