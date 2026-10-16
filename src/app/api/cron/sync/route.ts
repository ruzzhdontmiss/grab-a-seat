/**
 * POST /api/cron/sync — refresh quotes for games in the next 30 days (roadmap §7).
 *
 * QStash schedule: every 15 minutes, `Authorization: Bearer $CRON_SECRET`.
 */

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { assertCronAuthorized } from "@/lib/cron-auth";
import { runSync } from "@/lib/sync/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request): Promise<NextResponse> {
  const auth = assertCronAuthorized(request);
  if (!auth.ok) return auth.response;

  try {
    const summary = await runSync();

    // Public league/home pages are cached; refresh them after a sync (roadmap §2 ISR).
    for (const path of ["/", "/nfl", "/nba"]) {
      revalidatePath(path);
    }

    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[cron:sync] failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const POST = handle;
export const GET = handle;
