"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null); // For local testing display
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResetLink(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Failed to request password reset.");
        return;
      }

      setSuccess(true);
      if (result.resetLink) {
        // In local development, show the link directly to save developer time!
        setResetLink(result.resetLink);
      }
    } catch {
      setError("Unable to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border/40 bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Forgot Password</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your admin email address and we&apos;ll help you reset your password.
        </p>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-md bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
              <p className="font-medium">Request Sent Successfully</p>
              <p className="mt-1 text-xs">
                If an account exists with this email, the reset link has been dispatched.
              </p>
            </div>
            
            {resetLink && (
              <div className="rounded-md bg-blue-500/10 p-4 text-sm text-blue-600 dark:text-blue-400">
                <p className="font-semibold">Developer Testing Shortcut:</p>
                <p className="mt-1 text-xs select-all font-mono break-all bg-background border border-border/40 p-2 rounded">
                  {resetLink}
                </p>
                <p className="mt-2 text-xs">
                  This link has also been printed in the server terminal logs.
                </p>
              </div>
            )}

            <Link
              href="/admin/login"
              className="inline-block w-full text-center rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium transition-colors hover:bg-primary/90"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-70 transition-colors hover:bg-primary/90"
            >
              {isSubmitting ? "Submitting..." : "Send Reset Link"}
            </button>

            <div className="text-center pt-2">
              <Link href="/admin/login" className="text-sm text-primary hover:underline">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
