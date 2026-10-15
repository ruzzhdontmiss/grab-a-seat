import { z } from "zod";

/**
 * teams.json validation schema (see README "Data: teams.json").
 * This is the contract for the curated static team list.
 */
export const teamSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  league: z.enum(["nfl", "nba"]),
  city: z.string(),
  name: z.string(),
  abbr: z.string().min(2).max(4),
  conference: z.string(),
  division: z.string(),
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  seatgeekSlug: z.string(),
  tmAttractionId: z.string().nullable(),
});

export const teamsSchema = z.array(teamSchema);

export type Team = z.infer<typeof teamSchema>;

/** Slug used for the combined "away-at-home" game slug. */
export function gameSlug(league: string, awaySlug: string, homeSlug: string, startsAt: Date): string {
  const day = startsAt.toISOString().slice(0, 10);
  return `${league}-${awaySlug}-at-${homeSlug}-${day}`;
}
