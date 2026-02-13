-- CreateTable
CREATE TABLE "Puzzle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "PuzzleId" TEXT NOT NULL,
    "FEN" TEXT NOT NULL,
    "Moves" TEXT NOT NULL,
    "Rating" TEXT NOT NULL,
    "RatingDeviation" TEXT NOT NULL,
    "Popularity" TEXT NOT NULL,
    "NbPlays" TEXT NOT NULL,
    "Themes" TEXT NOT NULL,
    "GameUrl" TEXT NOT NULL,
    "OpeningTags" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Puzzle_PuzzleId_key" ON "Puzzle"("PuzzleId");
