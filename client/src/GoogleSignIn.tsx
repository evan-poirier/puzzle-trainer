import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

interface GoogleSignInProps {
  onAuth: (credential: string) => Promise<void>;
}

export default function GoogleSignIn({ onAuth }: GoogleSignInProps) {
  const [error, setError] = useState("");

  return (
    <div className="google-signin">
      {error && <div className="auth-error">{error}</div>}
      <GoogleLogin
        onSuccess={(response) => {
          if (response.credential) {
            setError("");
            onAuth(response.credential).catch((err) => setError(err.message));
          }
        }}
        onError={() => setError("Google sign-in failed")}
      />
    </div>
  );
}
