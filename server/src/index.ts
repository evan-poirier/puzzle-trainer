import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/puzzle/random", async (_req, res) => {
  const count = await prisma.puzzle.count();
  const skip = Math.floor(Math.random() * count);
  const puzzle = await prisma.puzzle.findFirst({ skip });
  res.json(puzzle);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


