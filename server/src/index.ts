import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

app.use(express.json());

app.use(
  session({
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
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

app.post("/api/register", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, password: hashed },
  });

  req.session.userId = user.id;
  res.json({ id: user.id, username: user.username });
});

app.post("/api/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  req.session.userId = user.id;
  res.json({ id: user.id, username: user.username });
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
      res.json({ id: user.id, username: user.username });
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

app.get("/api/puzzle/random", requireAuth, async (_req, res) => {
  const count = await prisma.puzzle.count();
  const skip = Math.floor(Math.random() * count);
  const puzzle = await prisma.puzzle.findFirst({ skip });
  res.json(puzzle);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
