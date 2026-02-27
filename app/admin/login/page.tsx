"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter username and password.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }

      router.push("/admin/bookings");
      router.refresh();
    } catch {
      setError("Login failed due to a network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5efe6] px-6 py-12 text-[#5a1e1e]">
      <div className="mx-auto max-w-md rounded-2xl border border-[#d6c7b2] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#7a1c1c]">Admin Login</h1>
        <p className="mt-2 text-sm text-[#6b4c3b]">
          Sign in to access the bookings dashboard.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[#6b4c3b]">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-[#d6c7b2] bg-[#f9f4ec] px-3 py-2 outline-none focus:ring-2 focus:ring-[#7a1c1c]"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#6b4c3b]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#d6c7b2] bg-[#f9f4ec] px-3 py-2 outline-none focus:ring-2 focus:ring-[#7a1c1c]"
              autoComplete="current-password"
            />
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#7a1c1c] px-4 py-2 text-[#f5efe6] transition hover:-translate-y-0.5 hover:bg-[#5a1414] disabled:opacity-70"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
