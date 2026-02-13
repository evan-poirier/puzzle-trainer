import { PrismaClient } from "@prisma/client";
import { createReadStream } from "fs";
import { parse } from "csv-parse";
import path from "path";

const prisma = new PrismaClient();
const BATCH_SIZE = 1000;

async function main() {
  const csvPath = path.join(import.meta.dirname, "seed-data", "lichess_db_puzzle.csv");

  const parser = createReadStream(csvPath).pipe(
    parse({
      columns: [
        "puzzleId",
        "fen",
        "moves",
        "rating",
        "ratingDeviation",
        "popularity",
        "nbPlays",
        "themes",
        "gameUrl",
        "openingTags",
      ],
    })
  );

  let batch: any[] = [];
  let total = 0;

  for await (const row of parser) {
    // Skip header row or rows with unparseable data
    if (isNaN(parseInt(row.rating))) continue;

    batch.push({
      puzzleId: row.puzzleId,
      fen: row.fen,
      moves: row.moves,
      rating: parseInt(row.rating),
      ratingDeviation: parseInt(row.ratingDeviation),
      popularity: parseInt(row.popularity),
      nbPlays: parseInt(row.nbPlays),
      themes: row.themes,
      gameUrl: row.gameUrl,
      openingTags: row.openingTags ?? "",
    });

    if (batch.length >= BATCH_SIZE) {
      await prisma.puzzle.createMany({ data: batch });
      total += batch.length;
      console.log(`Inserted ${total} puzzles...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await prisma.puzzle.createMany({ data: batch });
    total += batch.length;
  }

  console.log(`Done. Inserted ${total} puzzles total.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
