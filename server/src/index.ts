import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { PrismaClient } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import path from "path";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const app = express();
const prisma = new PrismaClient();
const PORT = parseInt(process.env.PORT || "3000");
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  app.set("trust proxy", 1);
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(express.json());

app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: isProd,
    },
    secret: process.env.SESSION_SECRET || "puzzle-trainer-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000, // prune expired sessions every 2 min
      dbRecordIdIsSessionId: true,
    }),
  })
);

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

// --- Auth routes ---

app.post("/api/auth/google", async (req: Request, res: Response) => {
  const { credential } = req.body;
  if (!credential) {
    res.status(400).json({ error: "Missing credential" });
    return;
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      update: {
        email: payload.email,
        name: payload.name || payload.email,
        picture: payload.picture,
      },
      create: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
        picture: payload.picture,
      },
    });

    req.session.userId = user.id;
    res.json({ id: user.id, name: user.name, email: user.email, picture: user.picture });
  } catch {
    res.status(401).json({ error: "Token verification failed" });
  }
});

app.get("/api/me", (req: Request, res: Response) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  prisma.user
    .findUnique({ where: { id: req.session.userId } })
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      res.json({ id: user.id, name: user.name, email: user.email, picture: user.picture });
    });
});

app.post("/api/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// --- Puzzle routes ---

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/puzzle/random", requireAuth, async (req, res) => {
  const targetRating = req.query.rating ? parseInt(req.query.rating as string) : null;

  const ratingFilter = targetRating
    ? { rating: { gte: targetRating - 250, lte: targetRating + 250 } }
    : {};

  const count = await prisma.puzzle.count({ where: ratingFilter });
  if (count === 0) {
    res.status(404).json({ error: "No puzzles found in that rating range" });
    return;
  }

  const skip = Math.floor(Math.random() * count);
  const puzzle = await prisma.puzzle.findFirst({ where: ratingFilter, skip });
  res.json(puzzle);
});

app.post("/api/puzzle/attempt", requireAuth, async (req: Request, res: Response) => {
  const { puzzleId, correct } = req.body;
  if (!puzzleId || typeof correct !== "boolean") {
    res.status(400).json({ error: "puzzleId and correct are required" });
    return;
  }

  const puzzle = await prisma.puzzle.findUnique({ where: { puzzleId } });
  if (!puzzle) {
    res.status(404).json({ error: "Puzzle not found" });
    return;
  }

  const attempt = await prisma.puzzleAttempt.create({
    data: {
      userId: req.session.userId!,
      puzzleId: puzzle.id,
      correct,
    },
  });

  res.json(attempt);
});

app.get("/api/stats", requireAuth, async (req: Request, res: Response) => {
  const userId = req.session.userId!;

  const total = await prisma.puzzleAttempt.count({ where: { userId } });
  const correct = await prisma.puzzleAttempt.count({ where: { userId, correct: true } });
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const recent = await prisma.puzzleAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      puzzle: { select: { rating: true, themes: true } },
    },
  });

  res.json({ total, correct, accuracy, recent });
});

// Serve client build in production
if (isProd) {
  const clientPath = path.join(import.meta.dirname, "../public");
  app.use(express.static(clientPath));
  app.get("*path", (_req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
