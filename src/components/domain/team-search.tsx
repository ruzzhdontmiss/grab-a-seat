"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { TeamMonogram } from "@/components/ui/monogram";
import type { TeamColors } from "@/lib/types";

export interface SearchTeam {
  id: string;
  slug: string;
  league: "nfl" | "nba";
  name: string;
  city: string;
  abbr: string;
  colors: TeamColors;
}

/**
 * Hero search (roadmap §7). Filters the curated 62-team list locally — no
 * network round-trip, instant, and it never invents a team.
 */
export function TeamSearch({ teams }: { teams: SearchTeam[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const listId = useId();

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return teams
      .filter((team) =>
        `${team.city} ${team.name} ${team.abbr} ${team.league}`
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 7);
  }, [query, teams]);

  return (
    <div className="relative max-w-md">
      <div className="border-line bg-surface flex items-center gap-2 border px-3">
        <Search size={15} className="text-text-dim shrink-0" />
        <input
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-label="Search teams"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          placeholder="Find tickets for your team — try “Bears” or “Lakers”"
          className="text-text h-11 w-full bg-transparent text-[14px] outline-none placeholder:text-[#5C636B]"
        />
      </div>

      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="border-line bg-surface absolute z-10 mt-1 w-full border"
        >
          {results.map((team) => (
            <li key={team.id} role="option" aria-selected={false}>
              <Link
                href={`/${team.league}/${team.slug}`}
                className="border-line-soft hover:bg-surface-2 flex items-center gap-3 border-b px-3 py-2.5 last:border-0"
              >
                <TeamMonogram abbr={team.abbr} colors={team.colors} />
                <span className="text-[13px]">{team.name}</span>
                <span className="label ml-auto">{team.league}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
