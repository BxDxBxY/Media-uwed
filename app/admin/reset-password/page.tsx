"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Reset token is missing or invalid. Please request a new link.");
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
      const response = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Failed to reset password.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Unable to reset password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-destructive mb-2">Invalid Reset Link</h1>
        <p className="text-sm text-muted-foreground mb-6">
          The link you followed is missing a valid reset token.
        </p>
        <Link
          href="/admin/forgot-password"
          className="inline-block w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium transition-colors hover:bg-primary/90"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-emerald-600 mb-2">Password Reset Complete</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Your admin password has been successfully updated. You can now log in.
        </p>
        <Link
          href="/admin/login"
          className="inline-block w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium transition-colors hover:bg-primary/90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          New Password
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
          Confirm New Password
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
        {isSubmitting ? "Resetting..." : "Save Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border/40 bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Reset Password</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Please enter and confirm your new administrator password.
        </p>

        <Suspense fallback={<div className="text-center text-sm py-4 text-muted-foreground">Loading reset session...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
