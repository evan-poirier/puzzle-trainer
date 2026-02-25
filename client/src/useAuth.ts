import { useState, useEffect, useCallback } from "react";

interface User {
  id: number;
  username: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (username: string, password: string, isRegister: boolean) => {
      const endpoint = isRegister ? "/api/register" : "/api/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Authentication failed");
      }
      const data = await res.json();
      setUser(data);
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    setUser(null);
  }, []);

  const clearUser = useCallback(() => setUser(null), []);

  return { user, loading, login, logout, clearUser };
}
