"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signIn } from "@/lib/auth-client";

// Always shown for any login failure, regardless of what Better Auth's
// client actually reports (unrecognized email vs. wrong password vs. a
// network/transport error) -- the spec requires the failure reason to
// never be distinguishable from the outside, and this also means we never
// render Better Auth's raw error message text.
const GENERIC_LOGIN_ERROR = "Invalid email or password.";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit(email: string, password: string) {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn.email({ email, password });
      if (result?.error) {
        setError(GENERIC_LOGIN_ERROR);
        return;
      }
      router.push("/");
    } catch {
      setError(GENERIC_LOGIN_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleClick() {
    setError(null);
    setIsGoogleSubmitting(true);
    try {
      const result = await signIn.social({ provider: "google", callbackURL: "/" });
      if (result?.error) {
        setError(GENERIC_LOGIN_ERROR);
      }
    } catch {
      setError(GENERIC_LOGIN_ERROR);
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Sign in"
      submitLabel="Sign in"
      pendingLabel="Signing in…"
      error={error}
      isSubmitting={isSubmitting}
      isGoogleSubmitting={isGoogleSubmitting}
      onSubmit={handleSubmit}
      onGoogleClick={handleGoogleClick}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
            Create one
          </Link>
        </>
      }
    />
  );
}
