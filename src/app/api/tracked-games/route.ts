/**
 * POST /api/tracked-games — set / update / clear a per-game alert (roadmap §1.5).
 *
 * Body: {
 *   gameId: string,
 *   action?: "upsert" | "remove",
 *   thresholdCents?: number | null,
 *   pctDropThreshold?: number | null,
 *   onPriceDrop?: boolean,
 *   onNewTickets?: boolean,
 * }
 */

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trackedGames } from "@/lib/db/schema";

/** GET /api/tracked-games?gameId=… — used by the client AlertBox. */
export async function GET(request: Request) {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) return NextResponse.json({ settings: null });

  const gameId = new URL(request.url).searchParams.get("gameId");
  if (!gameId || !z.string().uuid().safeParse(gameId).success) {
    return NextResponse.json({ error: "valid gameId required" }, { status: 400 });
  }

  const row = await db.query.trackedGames.findFirst({
    where: and(
      eq(trackedGames.userId, session.user.id),
      eq(trackedGames.gameId, gameId),
    ),
  });

  return NextResponse.json({
    settings: row
      ? {
          tracked: true,
          thresholdCents: row.thresholdCents,
          pctDropThreshold: row.pctDropThreshold,
          onPriceDrop: row.onPriceDrop,
          onNewTickets: row.onNewTickets,
        }
      : {
          tracked: false,
          thresholdCents: null,
          pctDropThreshold: 10,
          onPriceDrop: true,
          onNewTickets: true,
        },
  });
}

const bodySchema = z.object({
  gameId: z.string().uuid(),
  action: z.enum(["upsert", "remove"]).default("upsert"),
  // $10,000 cap keeps a typo from creating a meaningless alert.
  thresholdCents: z.number().int().min(0).max(1_000_000).nullable().optional(),
  pctDropThreshold: z.number().int().min(1).max(90).nullable().optional(),
  onPriceDrop: z.boolean().optional(),
  onNewTickets: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { gameId, action, ...fields } = parsed.data;
  const userId = session.user.id;

  const existing = await db.query.trackedGames.findFirst({
    where: and(eq(trackedGames.userId, userId), eq(trackedGames.gameId, gameId)),
  });

  if (action === "remove") {
    if (existing) {
      await db.delete(trackedGames).where(eq(trackedGames.id, existing.id));
    }
    return NextResponse.json({ tracked: false });
  }

  if (existing) {
    await db
      .update(trackedGames)
      .set({
        thresholdCents: fields.thresholdCents ?? existing.thresholdCents,
        pctDropThreshold: fields.pctDropThreshold ?? existing.pctDropThreshold,
        onPriceDrop: fields.onPriceDrop ?? existing.onPriceDrop,
        onNewTickets: fields.onNewTickets ?? existing.onNewTickets,
      })
      .where(eq(trackedGames.id, existing.id));
    return NextResponse.json({ tracked: true, id: existing.id });
  }

  const [created] = await db
    .insert(trackedGames)
    .values({
      userId,
      gameId,
      thresholdCents: fields.thresholdCents ?? null,
      pctDropThreshold: fields.pctDropThreshold ?? 10,
      onPriceDrop: fields.onPriceDrop ?? true,
      onNewTickets: fields.onNewTickets ?? true,
    })
    .returning({ id: trackedGames.id });

  return NextResponse.json({ tracked: true, id: created.id });
}
