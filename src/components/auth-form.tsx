"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Shared email+password + Google-sign-in form used by both /login and
 * /register. The two pages differ only in copy and in what happens on
 * submit (which Better Auth client call is made, and how its result is
 * interpreted) -- that logic stays in each page component. This component
 * owns only the field state and the visual shell, styled with the same
 * design tokens (border-border, bg-background, etc.) established by the
 * editorial redesign.
 */
export function AuthForm({
  title,
  submitLabel,
  pendingLabel,
  error,
  isSubmitting,
  onSubmit,
  onGoogleClick,
  isGoogleSubmitting,
  footer,
}: {
  title: string;
  submitLabel: string;
  pendingLabel: string;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (email: string, password: string) => void;
  onGoogleClick: () => void;
  isGoogleSubmitting: boolean;
  footer: React.ReactNode;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(email, password);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-card-foreground tablet:p-8">
        <h1 className="mb-6 text-2xl font-black tracking-tight">{title}</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? pendingLabel : submitLabel}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isGoogleSubmitting}
          onClick={onGoogleClick}
        >
          {isGoogleSubmitting ? "Verbindung zu Google…" : "Login mit Google"}
        </Button>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      </div>
    </div>
  );
}
