/**
 * POST /api/cron/alerts — snapshot diff → alert_events → email (roadmap §7).
 *
 * QStash schedule: every 15 minutes with the CRON_SECRET header.
 * `?lane=digest` batches every event detected in the run into one email per fan.
 */

import { NextResponse } from "next/server";

import { runAlerts } from "@/lib/alerts/engine";
import { assertCronAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request): Promise<NextResponse> {
  const auth = assertCronAuthorized(request);
  if (!auth.ok) return auth.response;

  const lane = new URL(request.url).searchParams.get("lane") === "digest";

  try {
    const summary = await runAlerts({ digest: lane });
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[cron:alerts] failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const POST = handle;
export const GET = handle;
