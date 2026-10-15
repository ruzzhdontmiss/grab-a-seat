Here's your complete agent file. Save this as `roadmap.md` in your repo root and instruct your agent to "Execute Phase 0" — it's written so the agent works phase-by-phase with verification gates, and the design spec forces a distinctive, non-generic look.

````markdown
# FanTicket Hub — Agent Build Roadmap

> **Agent instructions file.** Work through phases sequentially. Do NOT start a phase
> until the previous phase's Definition of Done checklist passes. Ask the user for
> approval between phases. Never invent API fields — verify against linked docs.
> If a credential is missing, use Mock Mode (defined below) so the app always runs.

---

## 1. Product Overview

**FanTicket Hub** — a web-only price comparison + alerting site for NFL & NBA tickets.
Aggregates ticket availability and prices across marketplaces, shows the cheapest
options per game, and alerts fans (email → push → SMS) when prices drop or tickets
appear for teams they follow.

**We are NOT a ticket seller.** All purchases happen on partner sites via affiliate
deep links. Revenue = affiliate commissions + premium subscriptions.

**Core loops:**
1. Fan follows teams → sees schedule with live cheapest prices per game
2. Fan opens a game → sees all provider options side-by-side, sorted by all-in price
3. Fan sets an alert → cron compares price snapshots → email/push fires on drops

---

## 2. Tech Stack (pinned — do not substitute)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15+ (App Router)**, React 19, TypeScript strict | `pnpm` only |
| Styling | **Tailwind CSS v4** + CSS custom properties for tokens | No default shadcn look (see §4) |
| UI primitives | **Radix UI** (dialog, popover, dropdown, tabs, tooltip) wrapped in custom components | |
| DB | **PostgreSQL (Neon serverless)** + **Drizzle ORM** | Drizzle Kit for migrations |
| Auth | **better-auth** (email + password, magic link) | Free, code-first |
| Email | **Resend** + **React Email** templates | Free tier: 3k emails/mo |
| Push | **web-push** (VAPID) + service worker | Phase 2 |
| Payments | **Stripe** Checkout + webhooks | Phase 3 |
| SMS | **Twilio** | Phase 3, premium only |
| Jobs/cron | **Upstash QStash** schedules (preferred) or Vercel Cron | Vercel Hobby cron is too limited for 15-min syncs — use QStash |
| Caching | **Upstash Redis** | Cache provider API responses (TTL 5–15 min) |
| Charts | **Recharts** (heavily restyled to match design tokens) | Price history |
| Validation | **Zod** | All API + provider responses |
| State (client) | **TanStack Query v5** | |
| Icons | **Lucide** only | No emoji icons anywhere |
| Analytics | **PostHog** + internal affiliate click log | |
| Errors | **Sentry** (Phase 3) | |
| Hosting | **Vercel** | ISR for public pages |

---

## 3. Architecture

```
src/
  app/                      # routes (Next App Router)
    (marketing)/            # home, pricing, about, legal
    [league]/page.tsx       # /nfl, /nba
    [league]/[team]/        # team schedule page
    game/[id]/              # game detail / comparison page
    alerts/                 # logged-in dashboard
    api/
      cron/                 # sync + alert jobs (secured via CRON_SECRET)
      r/[provider]/         # affiliate redirect + click logging
      webhooks/stripe/
  components/
    ui/                     # custom primitives (button, table, badge, dialog…)
    domain/                 # PriceTable, GameRow, Ticker, AlertBox, TeamChip
  lib/
    providers/              # PROVIDER ABSTRACTION (below)
      base.ts  seatgeek.ts  ticketmaster.ts
      stubhub.ts vividseats.ts tickpick.ts gametime.ts   # deeplink-only providers
      normalize.ts  mock.ts
    affiliate/wrap.ts       # deeplink builders w/ tracking IDs from env
    alerts/engine.ts        # snapshot diff → alert_events → send
    db/ (schema.ts, queries.ts)
    fixtures/               # mock JSON per provider
```

**Provider abstraction (critical — build this first):**

```ts
type ProviderType = "inventory" | "deeplink";

interface TicketProvider {
  id: string;                 // "seatgeek"
  name: string;               // "SeatGeek"
  type: ProviderType;         // inventory = real prices; deeplink = send user to site
  hasFeesData: boolean;       // whether returned prices are all-in
  getGames(team: Team): Promise<NormalizedGame[]>;
  getQuote(game: Game): Promise<NormalizedQuote | null>;
}

interface NormalizedQuote {
  providerId: string;
  minPriceCents: number | null;   // base price
  feesCents: number | null;       // 0 if all-in provider
  allInCents: number;             // what fan actually pays (estimate if unknown)
  allInIsEstimate: boolean;       // FTC: label estimates clearly in UI
  listingCount: number | null;
  url: string;                    // wrapped affiliate URL
  fetchedAt: Date;
}
```

**Mock Mode:** every provider checks `if (!env.KEY) return mockProvider(id)` which
reads `lib/fixtures/{provider}.json`. Seed enough fixture data (8 NFL + 8 NBA teams,
2 weeks of games, realistic prices) that the UI is fully demo-able at all times.
Clearly tag mock data internally so it's never presented as real.

---

## 4. Design System — READ CAREFULLY (non-AI look is a hard requirement)

The site must feel like a **sports terminal / stadium jumbotron**, not a template.
Dense, data-forward, editorial. FORBIDDEN: purple/blue gradients, glassmorphism,
gradient text, blob shadows, rounded-2xl cards everywhere, default shadcn styling,
Inter-as-identity, emoji icons, "✨" copy, marketing fluff.

### Tokens (define as CSS vars in `globals.css`)

```css
--ink:        #0B0C0E;   /* page bg */
--surface:    #121417;
--surface-2:  #17191D;
--line:       #23262B;   /* 1px borders everywhere */
--line-soft:  #1A1C20;
--text:       #F2F3F5;
--text-dim:   #9BA1A9;
--volt:       #C8FF3D;   /* single accent. Primary buttons: volt bg, ink text */
--volt-press: #A8DC2A;
--amber:      #FFB224;   /* "rising price" only */
--red:        #FF5C5C;   /* sold out / errors only */
--radius:     4px;       /* max 6px. No pill buttons except tiny badges */
```

### Typography (via `next/font/google`)
- **Headlines:** `Barlow Condensed` 600/700, UPPERCASE, tracking-tight — scoreboard energy
- **Body/UI:** `Archivo` 400/500, 14–15px
- **Numbers/prices/stats:** `JetBrains Mono` with `font-variant-numeric: tabular-nums`
  — ALL prices render in mono, right-aligned

### Layout rules
- Dense tables over card grids: 40px rows, hairline dividers, right-aligned prices
- 1px borders everywhere; depth from borders, NOT shadows
- A **live ticker strip** at the very top of every page: marquee of recent price
  drops ("▼ 18% LAL-BOS · $71 → $58 · SeatGeek") — CSS animation, pauses on hover,
  honors `prefers-reduced-motion`
- Team colors used ONLY as small elements: 2px top border on team hero, tiny chip
  next to team name. Colors stored in `teams.json` as official hexes
- Logos: **text monogram chips** (e.g., "CHI" in team color) — do NOT scrape or hotlink
  team logos. Footer disclaimer: "Not affiliated with the NFL, NBA, or any team."
- Buttons: rectangular (4px radius), uppercase 13px letterspaced labels
- Motion: 150–200ms ease-out only. No bounce/spring
- Dark-first. Page content max-w-6xl, generous whitespace between sections, tight within tables

### Copy rules
Terse, confident, sports-desk tone. Good: "Cheapest since Dec 12". Bad:
"Great news! 🎉 Prices are dropping for this exciting matchup!"

---

## 5. Providers & Partner Programs (apply in parallel — approvals take 1–4 weeks)

| Provider | Inventory data | Affiliate | Sign-up channel | Phase |
|---|---|---|---|---|
| **SeatGeek** | ✅ Public API: events + `stats` (lowest/median price) | ✅ Partner program | seatgeek.com API form + partnerships page | 1 |
| **Ticketmaster** | ✅ Discovery API: events + `priceRanges` (no listings) | ✅ | developer.ticketmaster.com (free key) + CJ Affiliate | 1 |
| **StubHub** | ❌ deeplink only | ✅ | Impact Radius (app.impact.com) | 1 (deeplink) |
| **Vivid Seats** | ❌ deeplink only | ✅ | Impact Radius | 1 (deeplink) |
| **TickPick** | ❌ deeplink (partner API on approval) | ✅ | Impact Radius / direct partner page | 1 (deeplink) |
| **Gametime** | ❌ deeplink only | ✅ | Impact Radius | 2 |
| SeatGeek listings (TIP) | ✅ seat-level listings | — | Partner access request | 2 (if approved) |

**Build rules:**
- All provider IDs/tracking IDs come from env vars — never hardcode
- Wrap every outbound CTA through `/api/r/[provider]?game={id}`: logs an
  `affiliate_clicks` row, then 302 to the wrapped deeplink
- If a provider is pending approval, its env vars are empty → provider renders as
  "View on StubHub →" deeplink without price, and UI gracefully hides empty columns
- **Fee policy (FTC junk-fee rule):** always display all-in price. If fees unknown,
  estimate 20% base markup, render with "est." label and tooltip. Never show base
  price as if it's final

**Team/schedule data:** curated static `teams.json` (all 32 NFL + 30 NBA teams:
slug, city, name, abbr, official hex colors, conference/division, seatgeek performer
slug, ticketmaster attractionId). Schedules come from SeatGeek/Ticketmaster event
searches by performer + date range. Do not scrape ESPN.

---

## 6. Database Schema (Drizzle — write in `lib/db/schema.ts`)

```
users            id, email, name, plan ("free"|"premium"), createdAt
teams            id, slug, league, city, name, abbr, colors jsonb, seatgeekSlug, tmAttractionId
venues           id, name, city, seatgeekVenueId
games            id, slug, league, homeTeamId, awayTeamId, venueId, startsAt,
                 status, seatgeekEventId, ticketmasterId
follows          userId, teamId            (unique composite)
trackedGames     id, userId, gameId, thresholdCents?, onPriceDrop bool, onNewTickets bool,
                 pctDropThreshold int?, createdAt
priceSnapshots   id, gameId, providerId, minCents, maxCents, allInMinCents,
                 listingCount, fetchedAt    (append-only → this IS price history)
alertEvents      id, userId, gameId, type ("price_drop"|"threshold"|"new_tickets"|"low_ever"),
                 payload jsonb, channel, sentAt, dedupeKey
pushSubs         id, userId, endpoint (unique), p256dh, auth
affiliateClicks  id, gameId, providerId, userId?, createdAt
syncLog          id, job, providerId, startedAt, finishedAt, status, rowCount, error?
```

Index: `priceSnapshots (gameId, fetchedAt)`, `games (startsAt)`, `trackedGames (userId)`.

---

## 7. Routes

| Route | Page |
|---|---|
| `/` | Ticker, hero search ("Find tickets for your team"), league split NFL/NBA, biggest current drops table |
| `/nfl` `/nba` | Team grid: monogram chip, next game, cheapest current price, follow button |
| `/nfl/chicago-bears` | Team hero (color top-border), follow, schedule TABLE: date, opponent, venue, cheapest all-in price + provider badge, trend arrow (▼▼▲ vs 7d ago), CTA |
| `/game/[slug]` | THE money page: provider comparison table sorted by all-in price (Best Deal row highlighted volt), price history chart, alert box (threshold input + toggles), fee transparency note |
| `/alerts` | Auth-gated: tracked games table, follows, alert prefs, alert history feed |
| `/pricing` | Free vs Premium ($4.99/mo) comparison |
| `/about` `/privacy` `/terms` `/disclosure` | Legal incl. FTC affiliate disclosure |
| API | `/api/cron/sync`, `/api/cron/alerts`, `/api/r/[provider]`, `/api/webhooks/stripe`, auth routes |

SEO: per-team and per-game pages get `generateMetadata`, canonical URLs, JSON-LD
`schema.org/Event` with offers, dynamic OG images (`@vercel/og`), `sitemap.ts`.

---

## PHASE 0 — Foundation (setup only, no features)

1. `create-next-app` (TS strict, Tailwind v4, src dir, pnpm). ESLint + Prettier.
2. Design tokens §4 → `globals.css`; load the 3 fonts; build primitives:
   `Button`, `Table`, `Badge`, `Card` (custom-styled — no default shadcn look).
3. Neon project + Drizzle + full schema §6 + first migration.
4. `better-auth` wired (signup/login/logout, session middleware). Pages exist and work.
5. `teams.json` seeded into DB + seed script for fixtures (8 teams/sport, 2 wks games).
6. `.env.example` with ALL keys from §10; `lib/env.ts` with Zod validation.
7. Footer with disclaimers + affiliate disclosure.

**DoD:** `pnpm typecheck` ✅ · `pnpm build` ✅ · login/register works · DB migrated ·
`/` renders a static design-token page in the §4 aesthetic · commits use conventional style.

---

## PHASE 1 — MVP (this is the ship)

1. **Provider layer:** `base.ts`, `normalize.ts`, `mock.ts`; SeatGeek provider
   (events via `api.seatgeek.com/2/events?performers.slug=X&datetime_utc.gte=now`,
   read `stats.lowest_price` etc. — verify fields against docs, Zod-parse everything);
   Ticketmaster Discovery provider (`priceRanges`); StubHub/Vivid/TickPick/Gametime
   as deeplink providers. Mock fallback if keys absent.
2. **Affiliate module** `lib/affiliate/wrap.ts` + `/api/r/[provider]` redirect with
   click logging. All CTAs route through it.
3. **Sync job** `/api/cron/sync` (QStash schedule, every 15 min, `CRON_SECRET` header):
   for games in next 30 days → fetch quotes → insert `priceSnapshots` → update game
   cache. `syncLog` rows. Upstash Redis cache in front of provider calls.
4. **Pages:** home, `/nfl`, `/nba`, team page, game page with provider comparison
   table (price sort, Best Deal badge, est. fee labels, provider badges), trend arrows
   computed from last 2 snapshots.
5. **Alerts MVP:** follow teams; on game page set tracked-game alerts (threshold $,
   % drop, new tickets). `/api/cron/alerts`: diff latest vs previous snapshot,
   create `alertEvents` (dedupeKey = game+type+6h window), send via Resend using a
   React Email template that matches §4 (price drop card, single CTA deeplink).
   Free tier: max 1 email per game per 6h, daily digest option.
6. **SEO:** metadata, JSON-LD, sitemap, dynamic OG images.

**DoD:** With ONLY mock fixtures + one real key (SeatGeek), a user can: browse NFL →
open Bears page with schedule + prices → open a game → see provider comparison →
follow team → set a $50 threshold alert → simulate a snapshot drop in dev → receive
the email. Cron runs on schedule. Lighthouse ≥ 85. Build clean.

---

## PHASE 2 — Intelligence & Polish

1. **Price history:** chart on game page from `priceSnapshots` (Recharts, restyled:
   volt line, mono axis labels, hover crosshair). "Lowest since [date]" + "▲/▼ x% vs 7d" badges.
2. **Deal Score:** z-score of current all-in price vs that game's 30-day history →
   `GREAT DEAL / FAIR / HIGH` badge (volt/gray/red).
3. **Web push:** service worker + VAPID (`web-push`), permission prompt only after
   user opts in, push on price drops for tracked games, `/alerts` channel toggles.
4. **Ticker live:** marquee feeds from recent `alertEvents` (real, not static).
5. **Game page filters:** max price, min qty, seats-together, provider toggles (if
   listing data available from partner access; else provider-level only).
6. **Weekly digest email** per followed team (Sun evenings).
7. **Performance:** ISR for team/league pages (revalidate on sync via
   `revalidatePath`), Redis-cached quotes, route-level streaming, `next/image`.
8. PostHog events: page views, follow, alert_set, affiliate_click, outbound_cta.

**DoD:** price chart + deal scores render from real snapshot data; push notification
received on device; Lighthouse ≥ 90; no layout shift on ticker; empty states designed
(no blank boxes — "No price history yet — tracking now").

---

## PHASE 3 — Premium, Trust, Hardening

1. **Stripe premium** ($4.99/mo): Checkout + webhook → `users.plan`. Premium gates:
   instant alerts (5-min cron lane), SMS via Twilio, full price history, deal-score
   history, ad-free. `/pricing` page + upgrade flow + customer portal.
2. **SMS alerts** (Twilio) for premium, opt-in, frequency-capped.
3. **Calendar sync:** `/api/ics/[team]` per-team .ics feeds + per-game links.
4. **PWA:** manifest, offline shell for /alerts.
5. **Hardening:** Sentry, Upstash rate limiting on API routes, admin `/admin` sync
   monitor (auth-gated by ADMIN_EMAILS), Playwright smoke tests (browse→game→alert→email-stub).
6. **Legal final pass:** privacy, terms, FTC affiliate disclosure ("we may earn a
   commission"), no-NFL/NBA-affiliation disclaimer, all-in price labeling audit.

**DoD:** full funnel works end-to-end in production; premium gating enforced server-side;
e2e green; Lighthouse ≥ 95 on home + game pages; runbook in README (env setup, cron,
partner approvals).

---

## 8. Agent Working Rules

- Sequential phases. End each phase with the DoD checklist results in your final message.
- `pnpm typecheck` + `pnpm build` MUST pass before committing anything.
- Conventional commits per task (`feat(alerts): …`).
- Zod-parse every external API response. try/catch → log to `syncLog` → fall back to
  last good snapshot. The site must never blank out because a provider failed.
- Never render mock data as real; never fabricate inventory.
- No new dependencies without stating why. No CSS frameworks beyond Tailwind.
- When unsure about an API field, check the official docs first; if still unclear,
  ask the user — do not guess.

## 9. Cost Envelope (MVP)

Neon free · Vercel Hobby/Pro · Resend free (3k/mo) · Upstash free · SeatGeek API free ·
Ticketmaster Discovery free (5k calls/day) · better-auth free → **≈ $0–25/mo at launch.**

## 10. Environment Variables (`.env.example`)

```
DATABASE_URL=            # Neon
BETTER_AUTH_SECRET=      BETTER_AUTH_URL=
SEATGEEK_CLIENT_ID=      SEATGEEK_CLIENT_SECRET=
TICKETMASTER_API_KEY=
SEATGEEK_AFFILIATE_ID=   # from partner program
STUBHUB_AFFILIATE_ID=    # Impact
VIVIDSEATS_AFFILIATE_ID= # Impact
TICKPICK_AFFILIATE_ID=
GAMETIME_AFFILIATE_ID=   # Impact
TICKETMASTER_AFFILIATE_ID= # CJ
RESEND_API_KEY=          EMAIL_FROM="FanTicket Hub <alerts@…>"
QSTASH_TOKEN=            CRON_SECRET=
UPSTASH_REDIS_URL=       UPSTASH_REDIS_TOKEN=
VAPID_PUBLIC_KEY=        VAPID_PRIVATE_KEY=          # Phase 2
STRIPE_SECRET_KEY=       STRIPE_WEBHOOK_SECRET=       # Phase 3
TWILIO_SID=              TWILIO_TOKEN=  TWILIO_FROM=  # Phase 3
NEXT_PUBLIC_POSTHOG_KEY= NEXT_PUBLIC_POSTHOG_HOST=
SENTRY_DSN=                                           # Phase 3
ADMIN_EMAILS=
```
````

---

**Do these in parallel while your agent builds** — approvals are the long pole:

1. **SeatGeek API key** (developer form) — your only real inventory source for MVP
2. **Ticketmaster Discovery key** — instant, do today
3. **Impact Radius account** → apply to StubHub, Vivid Seats, Gametime programs
4. **TickPick + Ticketmaster (CJ) affiliate applications**
5. **Resend + Neon + Upstash accounts** — free, 10 minutes total

One honest caveat baked into the file: StubHub/Vivid Seats don't expose public listing-level APIs — so at launch, real prices come from SeatGeek + Ticketmaster, and the others render as deeplink CTAs. The architecture handles this cleanly, and if partner access gets approved later, flipping a provider from `deeplink` to `inventory` is a one-file change.