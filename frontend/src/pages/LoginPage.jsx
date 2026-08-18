import { useState } from "react";

import LoginCard from "../components/LoginCard";
import { API_URL } from "../config";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail ?? "Sign in failed");
      onLogin(result.user);
    } catch (submitError) {
      setError(submitError.message === "Failed to fetch"
        ? "Cannot reach the FastAPI server"
        : submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-grid" aria-hidden="true" />
      <LoginCard
        username={username}
        password={password}
        error={error}
        submitting={submitting}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
