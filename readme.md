FanTicket Hub
Ticket price comparison + alerts for NFL & NBA fans. We aggregate ticket prices acrossmarketplaces (SeatGeek, Ticketmaster, StubHub, Vivid Seats, TickPick, Gametime), showthe cheapest all-in option per game, and alert fans when prices drop or tickets appear.

We are not a ticket seller. All purchases happen on partner sites via affiliatelinks. This project is not affiliated with the NFL, NBA, or any team.

Source of truth for specs: roadmap.md — architecture (§3),design system (§4), providers (§5), DB schema (§6), routes (§7), phases & DoD.This README covers setup, operations, and data. It does not restate the specs.

Status
Phase	Scope	State
0	Foundation (setup, tokens, DB, auth)	☐
1	MVP (providers, sync, pages, email alerts)	☐
2	Intelligence & polish (history, push, deal scores)	☐
3	Premium, trust, hardening (Stripe, SMS, e2e)	☐
Update this table as phases complete.

Quick Start
Prerequisites: Node 20+, pnpm 9+, a Neon Postgres database.

pnpm installcp .env.example .env.local     # fill in DATABASE_URL + BETTER_AUTH_SECRET minimumpnpm db:migrate                # Drizzle migration against Neonpnpm db:seed                   # teams.json + fixture datapnpm dev                       # http://localhost:3000
The app runs in Mock Mode with zero real API keys (see below), so pnpm devworks immediately after seed.

Scripts
Command	What it does
pnpm dev	Dev server
pnpm build / pnpm start	Production build / serve
pnpm typecheck	TypeScript strict check (must pass before any commit)
pnpm lint	ESLint + Prettier
pnpm db:generate	Generate Drizzle migrations from schema
pnpm db:migrate	Apply migrations
pnpm db:seed	Seed teams + fixtures, verify provider slugs
pnpm db:studio	Drizzle Studio (inspect DB)
Environment Variables
Full list with comments: .env.example. Phase-gated — only fill what the current phase needs:

Phase	Required keys
0	DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL
1	SEATGEEK_CLIENT_ID/SECRET, TICKETMASTER_API_KEY, affiliate IDs, RESEND_API_KEY, EMAIL_FROM, QSTASH_TOKEN, CRON_SECRET, UPSTASH_REDIS_URL/TOKEN
2	VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_POSTHOG_KEY/HOST
3	STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, TWILIO_*, SENTRY_DSN, ADMIN_EMAILS
Missing keys never crash the app — providers fall back to Mock Mode.

Mock Mode
If a provider's API key is absent, that provider serves fixture JSON fromsrc/lib/fixtures/. Seeded fixtures cover 8 NFL + 8 NBA teams and 2 weeks of games.Mock data is tagged internally and never displayed as real. To force mock for aprovider that HAS a key, set MOCK_PROVIDERS=seatgeek,ticketmaster in .env.local.

Cron & Background Jobs
QStash schedules hit these endpoints with header Authorization: Bearer $CRON_SECRET:

Endpoint	Schedule	Job
POST /api/cron/sync	every 15 min	Fetch quotes for games in next 30 days → price_snapshots
POST /api/cron/alerts	every 15 min	Diff snapshots → alert_events → email/push
Manual trigger in dev:

curl -X POST http://localhost:3000/api/cron/sync \  -H "Authorization: Bearer $CRON_SECRET"
Partner Approvals Runbook
Approvals take 1–4 weeks — apply NOW, in parallel with Phase 0/1 development.Track status here:

Partner	Get	Where	Status
SeatGeek	API key + affiliate ID	seatgeek.com API form + partnerships page	☐ applied ☐ approved
Ticketmaster	Discovery API key (instant)	developer.ticketmaster.com	☐ approved
Ticketmaster	Affiliate (CJ)	CJ Affiliate (cj.com)	☐ applied ☐ approved
StubHub	Affiliate (deeplink only)	Impact Radius (app.impact.com)	☐ applied ☐ approved
Vivid Seats	Affiliate (deeplink only)	Impact Radius	☐ applied ☐ approved
Gametime	Affiliate	Impact Radius	☐ applied ☐ approved
TickPick	Affiliate (partner API later)	Impact Radius / direct	☐ applied ☐ approved
Until a partner approves, its affiliate env var stays empty and the UI renders aplain "View on {Provider} →" deeplink. No code changes needed on approval — justadd the ID to env.

Data: teams.json
All 32 NFL + 30 NBA teams. Seeded into the teams table by pnpm db:seed.

slug — globally unique, URL-safe (/nfl/chicago-bears)
abbr — unique per league (CHI exists in both NFL and NBA — that's fine)
colors — display-only approximations of official team colors, used ONLY forsmall chips/2px borders (see roadmap §4). We do not use official logo assets.
seatgeekSlug — SeatGeek performer slug. The seed script verifies each slugagainst GET api.seatgeek.com/2/performers?slug={slug} when a SeatGeek keyexists, and warns on mismatch.
tmAttractionId — intentionally null in the file. The seed scriptpopulates it via Ticketmaster Discovery:GET /discovery/v2/attractions.json?keyword={name}&classificationName={football|basketball}Run seed again after adding your Ticketmaster key. If it stays null, the UIsimply hides the Ticketmaster badge — never guess an ID.
Validation schema (src/lib/teams.ts):

import { z } from "zod";export const teamSchema = z.object({  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),  league: z.enum(["nfl", "nba"]),  city: z.string(),  name: z.string(),  abbr: z.string().min(2).max(4),  conference: z.string(),  division: z.string(),  colors: z.object({    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),  }),  seatgeekSlug: z.string(),  tmAttractionId: z.string().nullable(),});
DB constraints: teams.slug unique; unique composite on (league, abbr).

Deployment
Push to GitHub → import repo in Vercel
Attach Neon integration (injects DATABASE_URL for preview + prod)
Add all Phase-1 env vars in Vercel → Production
Create QStash schedule → https://yourdomain.com/api/cron/sync (15 min) withCRON_SECRET header; same for /api/cron/alerts
Run pnpm db:migrate against prod DATABASE_URL, then db:seed once
Verify: sync job writes sync_log rows; home page shows live prices
Legal & Disclaimers (non-negotiable, ship with MVP)
Footer on every page: "Not affiliated with the NFL, NBA, or any team."
Affiliate disclosure (FTC): "We may earn a commission on purchases made throughour links, at no extra cost to you."
All-in pricing: never display a base price as final. Estimates labeled "est."with tooltip (see roadmap §5 fee policy).
/privacy, /terms, /disclosure must be live before launch.
