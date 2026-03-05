import { useState, useEffect, useCallback } from "react";

export interface User {
  id: number;
  name: string;
  email: string;
  picture?: string;
  rating: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [initialPuzzle, setInitialPuzzle] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          const { initialPuzzle: puzzle, ...userData } = data;
          setUser(userData);
          setInitialPuzzle(puzzle);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) {
      const text = await res.text();
      let message = "Authentication failed";
      try { message = JSON.parse(text).error || message; } catch {}
      throw new Error(message);
    }
    const data = await res.json();
    setUser(data);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    setUser(null);
  }, []);

  const clearUser = useCallback(() => setUser(null), []);

  return { user, setUser, initialPuzzle, loading, loginWithGoogle, logout, clearUser };
}
