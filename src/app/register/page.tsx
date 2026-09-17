"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signIn, signUp } from "@/lib/auth-client";

const ALREADY_REGISTERED_ERROR = "An account with this email already exists.";
const GENERIC_REGISTER_ERROR = "Something went wrong. Please try again.";
// Reuses the same non-enumerating copy as the login page for the Google
// button's failure path, since a social-sign-in failure here isn't a
// "this email is taken" case in the same sense.
const GENERIC_GOOGLE_ERROR = "Something went wrong. Please try again.";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit(email: string, password: string) {
    setError(null);
    setIsSubmitting(true);
    try {
      // Better Auth's schema requires a `name` on every user; this app has
      // no display-name field (out of scope per spec), so the email
      // address doubles as the name -- it's only ever used as a fallback
      // display label, never shown as a separate identity.
      const result = await signUp.email({ email, password, name: email });
      if (result?.error) {
        // Never surfaces Better Auth's raw error message -- only this
        // specific, known-safe code gets its own copy; anything else
        // (including error shapes we don't recognize) falls back to a
        // generic message.
        if (result.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
          setError(ALREADY_REGISTERED_ERROR);
        } else {
          setError(GENERIC_REGISTER_ERROR);
        }
        return;
      }
      router.push("/");
    } catch {
      setError(GENERIC_REGISTER_ERROR);
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
        setError(GENERIC_GOOGLE_ERROR);
      }
    } catch {
      setError(GENERIC_GOOGLE_ERROR);
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Create your account"
      submitLabel="Create account"
      pendingLabel="Creating account…"
      error={error}
      isSubmitting={isSubmitting}
      isGoogleSubmitting={isGoogleSubmitting}
      onSubmit={handleSubmit}
      onGoogleClick={handleGoogleClick}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    />
  );
}
