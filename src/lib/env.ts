import { z } from "zod";

/**
 * Environment validation (roadmap §10).
 *
 * Phase-gated: only DATABASE_URL and BETTER_AUTH_SECRET are required. Every other
 * key is optional — its absence simply disables the matching integration and the
 * app falls back to Mock Mode instead of crashing.
 */

const blankToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/** Optional string; empty strings ("") are treated as unset. */
const optionalString = z.preprocess(blankToUndefined, z.string().optional());

/** Optional comma-separated list -> string[] (empty string -> []). */
const optionalCsv = z.preprocess(
  (value) =>
    typeof value === "string"
      ? value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      : value,
  z.array(z.string()).default([]),
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // ── Phase 0 ───────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(16, "BETTER_AUTH_SECRET must be at least 16 characters"),
  BETTER_AUTH_URL: z.string().min(1).default("http://localhost:3000"),

  // ── Phase 1 — providers ───────────────────────────────────────────────────
  SEATGEEK_CLIENT_ID: optionalString,
  SEATGEEK_CLIENT_SECRET: optionalString,
  TICKETMASTER_API_KEY: optionalString,

  // ── Phase 1 — affiliate tracking IDs ──────────────────────────────────────
  SEATGEEK_AFFILIATE_ID: optionalString,
  STUBHUB_AFFILIATE_ID: optionalString,
  VIVIDSEATS_AFFILIATE_ID: optionalString,
  TICKPICK_AFFILIATE_ID: optionalString,
  GAMETIME_AFFILIATE_ID: optionalString,
  TICKETMASTER_AFFILIATE_ID: optionalString,

  // ── Phase 1 — email, jobs, cache ──────────────────────────────────────────
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
  QSTASH_TOKEN: optionalString,
  CRON_SECRET: optionalString,
  UPSTASH_REDIS_URL: optionalString,
  UPSTASH_REDIS_TOKEN: optionalString,
  MOCK_PROVIDERS: optionalCsv,

  // ── Phase 2 — push + analytics ────────────────────────────────────────────
  VAPID_PUBLIC_KEY: optionalString,
  VAPID_PRIVATE_KEY: optionalString,
  NEXT_PUBLIC_POSTHOG_KEY: optionalString,
  NEXT_PUBLIC_POSTHOG_HOST: optionalString,

  // ── Phase 3 — premium, SMS, errors, admin ─────────────────────────────────
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  TWILIO_SID: optionalString,
  TWILIO_TOKEN: optionalString,
  TWILIO_FROM: optionalString,
  SENTRY_DSN: optionalString,
  ADMIN_EMAILS: optionalCsv,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  throw new Error(
    `Invalid environment variables:\n${details}\n\n` +
      "Copy .env.example to .env.local and set the required Phase 0 keys.",
  );
}

export const env = parsed.data;
export type Env = typeof env;
