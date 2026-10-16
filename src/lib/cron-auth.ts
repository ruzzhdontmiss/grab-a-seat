/**
 * Cron authorization (roadmap §1.3, §10).
 *
 * QStash schedules hit the cron endpoints with
 * `Authorization: Bearer $CRON_SECRET`. When CRON_SECRET is unset we allow
 * local/dev triggers (so the job is testable) but refuse to run unprotected in
 * production.
 */

import { NextResponse } from "next/server";

import { env } from "@/lib/env";

export type CronAuthResult = { ok: true } | { ok: false; response: NextResponse };

export function assertCronAuthorized(request: Request): CronAuthResult {
  const secret = env.CRON_SECRET;

  if (!secret) {
    if (env.NODE_ENV === "production") {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "CRON_SECRET is not configured" },
          { status: 500 },
        ),
      };
    }
    return { ok: true };
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  if (token !== secret) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true };
}
