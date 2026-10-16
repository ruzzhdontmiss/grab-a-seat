import type { MetadataRoute } from "next";

import { getAllTeams, getUpcomingGames } from "@/lib/db/queries";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [teams, games] = await Promise.all([
    getAllTeams(),
    getUpcomingGames({ limit: 500 }),
  ]);
  const now = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: absoluteUrl("/nfl"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/nba"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/pricing"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    ...teams.map((team) => ({
      url: absoluteUrl(`/${team.league}/${team.slug}`),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...games.map((game) => ({
      url: absoluteUrl(`/game/${game.slug}`),
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
  ];
}
