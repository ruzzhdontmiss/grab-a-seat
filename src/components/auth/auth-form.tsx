"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const inputClass =
  "h-10 w-full rounded-md border border-line bg-surface-2 px-3 text-[14px] text-text transition-colors duration-150 placeholder:text-text-dim focus:border-volt focus:outline-none";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/alerts";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignUp = mode === "sign-up";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Try again.");
      setPending(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="label">{isSignUp ? "Create account" : "Welcome back"}</p>
      <h1 className="mt-3 text-3xl">
        {isSignUp ? "Set your alerts" : "Sign in"}
      </h1>
      <p className="mt-2 text-[13px] text-text-dim">
        {isSignUp
          ? "Follow teams and track prices. No spam, no resale."
          : "Track prices and manage the teams you follow."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {isSignUp && (
          <div className="space-y-1.5">
            <label htmlFor="name" className="label block">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
              placeholder="Jordan Reyes"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="label block">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="label block">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            placeholder="At least 8 characters"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red/40 bg-red/10 px-3 py-2 text-[12px] text-red"
          >
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Working…" : isSignUp ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-text-dim">
        {isSignUp ? "Already have an account? " : "New here? "}
        <Link
          href={isSignUp ? "/login" : "/register"}
          className="text-volt transition-colors duration-150 hover:text-volt-press"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}
