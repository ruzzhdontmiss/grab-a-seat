/**
 * POST /api/follows — follow / unfollow a team (roadmap §1.5).
 * Body: { teamId: string, action?: "toggle" | "follow" | "unfollow" }
 */

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { follows } from "@/lib/db/schema";

/** GET /api/follows?teamId=… — used by the client FollowButton. */
export async function GET(request: Request) {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) return NextResponse.json({ following: false });

  const teamId = new URL(request.url).searchParams.get("teamId");
  if (!teamId || !z.string().uuid().safeParse(teamId).success) {
    return NextResponse.json({ error: "valid teamId required" }, { status: 400 });
  }

  const existing = await db.query.follows.findFirst({
    where: and(eq(follows.userId, session.user.id), eq(follows.teamId, teamId)),
  });
  return NextResponse.json({ following: Boolean(existing) });
}

const bodySchema = z.object({
  teamId: z.string().uuid(),
  action: z.enum(["toggle", "follow", "unfollow"]).default("toggle"),
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
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { teamId, action } = parsed.data;
  const userId = session.user.id;

  const existing = await db.query.follows.findFirst({
    where: and(eq(follows.userId, userId), eq(follows.teamId, teamId)),
  });

  const shouldFollow =
    action === "follow" ? true : action === "unfollow" ? false : !existing;

  if (shouldFollow && !existing) {
    await db.insert(follows).values({ userId, teamId }).onConflictDoNothing();
  } else if (!shouldFollow && existing) {
    await db.delete(follows).where(eq(follows.id, existing.id));
  }

  return NextResponse.json({ following: shouldFollow });
}
