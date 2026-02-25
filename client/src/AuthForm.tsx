import { useState, type FormEvent } from "react";

interface AuthFormProps {
  onAuth: (username: string, password: string, isRegister: boolean) => Promise<void>;
}

export default function AuthForm({ onAuth }: AuthFormProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onAuth(username, password, isRegister);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>{isRegister ? "Create Account" : "Log In"}</h2>

      {error && <div className="auth-error">{error}</div>}

      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        autoFocus
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button type="submit" disabled={submitting}>
        {submitting ? "..." : isRegister ? "Register" : "Log In"}
      </button>

      <p className="auth-toggle">
        {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
        <button type="button" onClick={() => { setIsRegister(!isRegister); setError(""); }}>
          {isRegister ? "Log in" : "Register"}
        </button>
      </p>
    </form>
  );
}
