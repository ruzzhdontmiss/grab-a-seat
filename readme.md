FanTicket Hub
Ticket price comparison + alerts for NFL & NBA fans. We aggregate ticket prices across
marketplaces (SeatGeek, Ticketmaster, StubHub, Vivid Seats, TickPick, Gametime), show the
cheapest all-in option per game, and alert fans when prices drop or tickets appear.

We are not a ticket seller. All purchases happen on partner sites via affiliate links.
This project is not affiliated with the NFL, NBA, or any team.

Source of truth for specs: `roadmap.md` — architecture (§3), design system (§4),
providers (§5), DB schema (§6), routes (§7), phases & DoD. This README covers setup,
operations, and data. It does not restate the specs.

## Status

| Phase | Scope                                          | State |
| ----- | ---------------------------------------------- | ----- |
| 0     | Foundation (setup, tokens, DB, auth)           | ☑     |
| 1     | MVP (providers, sync, pages, email alerts)     | ☑     |
| 2     | Intelligence & polish (history, push, scores)  | ☐     |
| 3     | Premium, trust, hardening (Stripe, SMS, e2e)   | ☐     |

## Quick Start

Prerequisites: Node 20+, pnpm 9+, a Neon Postgres database.

```bash
pnpm install
cp .env.example .env.local      # fill in DATABASE_URL + BETTER_AUTH_SECRET minimum
pnpm db:migrate                 # Drizzle migrations against Neon
pnpm db:seed                    # teams.json + fixture games + provider fixtures
pnpm dev                        # http://localhost:3000
```

The app runs in **Mock Mode** with zero real API keys (see below), so `pnpm dev` works
immediately after seed.

## Scripts

| Command           | What it does                                                       |
| ----------------- | ------------------------------------------------------------------ |
| `pnpm dev`        | Dev server (Turbopack)                                             |
| `pnpm build` / `pnpm start` | Production build / serve                                 |
| `pnpm typecheck`  | TypeScript strict check (must pass before any commit)              |
| `pnpm lint`       | ESLint                                                             |
| `pnpm format`     | Prettier write (`format:check` in CI)                              |
| `pnpm db:generate`| Generate Drizzle migrations from schema                            |
| `pnpm db:migrate` | Apply migrations                                                   |
| `pnpm db:seed`    | Seed teams + fixture games + provider fixtures                     |
| `pnpm sim:drop`   | Inject a price drop and run the alerts engine (dev)                |
| `pnpm db:studio`  | Drizzle Studio (inspect DB)                                        |

## Environment Variables

Full list with comments: `.env.example`. Phase-gated — only fill what the current phase
needs:

| Phase | Required keys |
| ----- | ------------- |
| 0 | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |
| 1 | `SEATGEEK_CLIENT_ID/SECRET`, `TICKETMASTER_API_KEY`, affiliate IDs, `RESEND_API_KEY`, `EMAIL_FROM`, `QSTASH_TOKEN`, `CRON_SECRET`, `UPSTASH_REDIS_URL/TOKEN` |
| 2 | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_POSTHOG_KEY/HOST` |
| 3 | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TWILIO_*`, `SENTRY_DSN`, `ADMIN_EMAILS` |

Missing keys never crash the app — providers fall back to Mock Mode.

## Mock Mode

If a provider's API key is absent (or the provider is listed in `MOCK_PROVIDERS`), that
provider serves fixture JSON from `src/lib/fixtures/`. Seeded fixtures cover 8 NFL + 8 NBA
teams and 2 weeks of games. **Mock data is tagged internally and never rendered as
real** — game pages show a `mock` badge on mocked providers, and the `/alerts` dashboard
shows a Mock-Mode banner.

To force mock for a provider that HAS a key, set `MOCK_PROVIDERS=seatgeek,ticketmaster`
in `.env.local`.

### Fee policy (all-in pricing)

Neither SeatGeek's nor Ticketmaster's public API documents fee-inclusive prices, so both
inventory providers report `hasFeesData: false` and every total carries the roadmap §5
estimate (**+20%**), labelled **`est.`** everywhere it appears. If a provider ever returns
all-in prices, flip one flag (`hasFeesData` in `src/lib/providers/<provider>.ts`) and the
labels disappear.

## Providers

| Provider | Type | Price source | Notes |
| -------- | ---- | ------------ | ----- |
| SeatGeek | inventory | `stats.lowest_price` | Docs: <https://seatgeek.github.io/>. Fees unknown → estimated. |
| Ticketmaster | inventory | `priceRanges[].min` | Requires `teams.tmAttractionId` (populated by seed when a key exists). |
| StubHub / Vivid Seats / TickPick / Gametime | deeplink | — | CTA only; public search URL until an affiliate link template is approved. |

Every outbound CTA goes through `GET /api/r/{provider}?game={id}`, which recomputes the
destination server-side, logs an `affiliate_clicks` row, and 302s to the affiliate-wrapped
URL. Tracking IDs come from env only; each request is Zod-parsed before use.

## Cron & Background Jobs

QStash schedules hit these endpoints with header `Authorization: Bearer $CRON_SECRET`:

| Endpoint | Schedule | Job |
| -------- | -------- | --- |
| `POST /api/cron/sync` | every 15 min | Fetch quotes for games in the next 30 days → `price_snapshots` |
| `POST /api/cron/alerts` | every 15 min | Diff snapshots → `alert_events` → email (one per game per 6h) |
| `POST /api/cron/alerts?lane=digest` | daily | Same diff, but batch each fan's events into one digest email |

Manual trigger in dev (`CRON_SECRET` unset is allowed outside production):

```bash
curl -X POST http://localhost:3000/api/cron/sync
curl -X POST http://localhost:3000/api/cron/alerts
```

Provider responses are cached in Upstash Redis (`lib/cache.ts`) with a 10-minute TTL; with
no Upstash credentials it degrades to an in-process cache, and with no cache at all the
fetch simply proceeds.

## Alerts

Follow a team, or open a game and set a **$ threshold** / **% drop** / **new tickets**
alert. The alerts cron compares each game's latest snapshot against the previous one and,
on a trigger, writes an `alert_events` row (`dedupeKey = user:game:type:6h-window`) and
sends an email. Free tier: **max one email per game per 6 hours**.

Without `RESEND_API_KEY` the email is *rendered* and written to `.email-outbox/*.html`
instead of sent, so the whole pipeline is inspectable in dev.

### Simulate a drop in dev

```bash
pnpm sim:drop                                  # Bears' next home game, drops to $45
pnpm sim:drop -- --game=nba-... --to=38        # explicit game + target price
pnpm sim:drop -- --digest                      # exercise the digest lane
```

It inserts a baseline snapshot plus a lower current snapshot, then runs the alerts engine
and reports what fired. `--digest` batches each fan's events into one email instead of
one email per game.

## SEO

Per-team and per-game pages emit `generateMetadata` (canonical + Open Graph), JSON-LD
(`SportsTeam`, `SportsEvent` with one `Offer` per provider), and dynamic OG images via
`next/og`. `sitemap.xml` and `robots.txt` are generated from the database.

## Deployment

1. Push to GitHub → import repo in Vercel
2. Attach Neon integration (injects `DATABASE_URL` for preview + prod)
3. Add all Phase-1 env vars in Vercel → Production
4. Create QStash schedules → `https://yourdomain.com/api/cron/sync` (15 min) with the
   `CRON_SECRET` header; same for `/api/cron/alerts`
5. Run `pnpm db:migrate` against the prod `DATABASE_URL`, then `db:seed` once
6. Verify: sync job writes `sync_log` rows; home page shows live prices

## Partner Approvals Runbook

Approvals take 1–4 weeks — apply early. Track status here:

| Partner | Get | Where | Status |
| ------- | --- | ----- | ------ |
| SeatGeek | API key + affiliate ID | seatgeek.com API form + partnerships page | ☐ applied ☐ approved |
| Ticketmaster | Discovery API key (instant) | developer.ticketmaster.com | ☐ approved |
| Ticketmaster | Affiliate (CJ) | CJ Affiliate (cj.com) | ☐ applied ☐ approved |
| StubHub | Affiliate (deeplink only) | Impact Radius (app.impact.com) | ☐ applied ☐ approved |
| Vivid Seats | Affiliate (deeplink only) | Impact Radius | ☐ applied ☐ approved |
| Gametime | Affiliate | Impact Radius | ☐ applied ☐ approved |
| TickPick | Affiliate (partner API later) | Impact Radius / direct | ☐ applied ☐ approved |

Until a partner approves, its affiliate env var stays empty and the UI renders a plain
"View on {Provider} →" deeplink. No code changes needed on approval — just add the ID to
env. Affiliate parameter names live in one place (`src/lib/affiliate/wrap.ts`) and should
be verified against each approved link format.

## Data: teams.json

All 32 NFL + 30 NBA teams. Seeded into the `teams` table by `pnpm db:seed`.

- `slug` — globally unique, URL-safe (`/nfl/chicago-bears`)
- `abbr` — unique per league (CHI exists in both NFL and NBA — that's fine)
- `colors` — display-only approximations of official team colors, used ONLY for small
  chips/2px borders (see roadmap §4). We do not use official logo assets.
- `seatgeekSlug` — SeatGeek performer slug. The seed verifies each slug against
  `GET api.seatgeek.com/2/performers?slug={slug}` when a SeatGeek key exists.
- `tmAttractionId` — intentionally null in the file. The seed populates it via Ticketmaster
  Discovery. If it stays null the UI hides the Ticketmaster badge — never guess an ID.

Validation schema lives in `src/lib/teams.ts`.

## Legal & Disclaimers (non-negotiable, ship with MVP)

- Footer on every page: "Not affiliated with the NFL, NBA, or any team."
- Affiliate disclosure (FTC): "We may earn a commission on purchases made through our
  links, at no extra cost to you."
- All-in pricing: never display a base price as final; estimates are labelled "est." with a
  tooltip/explanation.
- `/privacy`, `/terms`, `/disclosure` are live.
