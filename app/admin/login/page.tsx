"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!identity.trim()) {
      setError("Please enter your username or email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: identity.trim(), password }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Login failed.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Unable to login. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border/40 bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Admin Login</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sign in with your admin username or email.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="identity" className="block text-sm font-medium mb-1">
              Username or email
            </label>
            <input
              id="identity"
              type="text"
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              autoComplete="current-password"
              required
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-70 transition-colors hover:bg-primary/90"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-4">
            <Link href="/admin/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
            <Link href="/admin/signup" className="text-xs text-primary hover:underline">
              Request Access
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
