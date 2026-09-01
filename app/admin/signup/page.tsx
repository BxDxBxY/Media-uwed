"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function AdminSignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!username.trim() || !email.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Registration failed.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Unable to submit registration. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-border/40 bg-card p-6 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-emerald-600 mb-2">Registration Requested</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your admin registration request has been submitted successfully. 
            An existing super administrator must approve your account before you can log in.
          </p>
          <Link
            href="/admin/login"
            className="inline-block w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium transition-colors hover:bg-primary/90"
          >
            Return to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border/40 bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Request Admin Access</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Create an account. Subject to super admin approval.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-70 transition-colors hover:bg-primary/90"
          >
            {isSubmitting ? "Submitting..." : "Submit Access Request"}
          </button>

          <div className="text-center pt-2">
            <Link href="/admin/login" className="text-sm text-primary hover:underline">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
