"use client";

import { BellRing, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

interface Settings {
  tracked: boolean;
  thresholdCents: number | null;
  pctDropThreshold: number | null;
  onPriceDrop: boolean;
  onNewTickets: boolean;
}

const DEFAULTS: Settings = {
  tracked: false,
  thresholdCents: null,
  pctDropThreshold: 10,
  onPriceDrop: true,
  onNewTickets: true,
};

/**
 * Per-game alert box (roadmap §1.5): a $ threshold, a % drop, and new-ticket
 * toggles. Writes to /api/tracked-games, which the alerts cron then evaluates.
 *
 * Loads its own state so the game page can stay static (ISR).
 */
export function AlertBox({ gameId, nextPath }: { gameId: string; nextPath: string }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [threshold, setThreshold] = useState("");
  const [pctDrop, setPctDrop] = useState("10");
  const [onPriceDrop, setOnPriceDrop] = useState(true);
  const [onNewTickets, setOnNewTickets] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySettings = useCallback((next: Settings) => {
    setSettings(next);
    setThreshold(
      next.thresholdCents !== null ? (next.thresholdCents / 100).toFixed(2) : "",
    );
    setPctDrop(String(next.pctDropThreshold ?? 10));
    setOnPriceDrop(next.onPriceDrop);
    setOnNewTickets(next.onNewTickets);
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    (async () => {
      try {
        const response = await fetch(
          `/api/tracked-games?gameId=${encodeURIComponent(gameId)}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const json = (await response.json()) as { settings: Settings | null };
        if (active && json.settings) applySettings(json.settings);
      } catch {
        if (active) applySettings(DEFAULTS);
      }
    })();
    return () => {
      active = false;
    };
  }, [session, gameId, applySettings]);

  if (isPending) {
    return <div className="border-line-soft h-40 rounded-md border" />;
  }

  if (!session) {
    return (
      <div className="border-line bg-surface rounded-md border p-4">
        <p className="label">Price alerts</p>
        <p className="text-text-dim mt-3 text-[13px]">
          Sign in to set a price target for this game. We email you the moment the
          all-in price clears it.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(nextPath)}`}
          className={buttonVariants({ size: "sm", className: "mt-4" })}
        >
          Sign in to set alerts
        </Link>
      </div>
    );
  }

  const submit = (action: "upsert" | "remove") => {
    setError(null);
    const dollars = Number.parseFloat(threshold);
    const thresholdCents =
      threshold.trim() === "" || Number.isNaN(dollars)
        ? null
        : Math.round(dollars * 100);

    startTransition(async () => {
      try {
        const response = await fetch("/api/tracked-games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId,
            action,
            thresholdCents,
            pctDropThreshold: Number.parseInt(pctDrop, 10) || null,
            onPriceDrop,
            onNewTickets,
          }),
        });
        if (!response.ok) {
          setError("Could not save. Try again.");
          return;
        }
        if (action === "remove") {
          applySettings({ ...DEFAULTS, tracked: false });
          setSaved("Alert removed");
        } else {
          applySettings({
            tracked: true,
            thresholdCents,
            pctDropThreshold: Number.parseInt(pctDrop, 10) || null,
            onPriceDrop,
            onNewTickets,
          });
          setSaved("Alert saved");
        }
        router.refresh();
      } catch {
        setError("Could not save. Try again.");
      }
    });
  };

  return (
    <div className="border-line bg-surface rounded-md border">
      <div className="border-line flex items-center justify-between gap-3 border-b px-4 py-3">
        <span className="label">Price alerts</span>
        {settings === null ? (
          <span className="border-line-soft h-4 w-12 rounded-sm border" />
        ) : settings.tracked ? (
          <Badge variant="volt">tracking</Badge>
        ) : (
          <Badge variant="neutral">off</Badge>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div>
          <label htmlFor="threshold" className="label">
            Alert me under
          </label>
          <div className="border-line mt-2 flex items-center gap-2 border px-2">
            <span className="text-text-dim font-mono text-[13px]">$</span>
            <input
              id="threshold"
              inputMode="decimal"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              placeholder="50.00"
              className="text-text h-9 w-full bg-transparent font-mono text-[14px] tabular-nums outline-none placeholder:text-[#5C636B]"
            />
          </div>
          <p className="text-text-dim mt-2 text-[11px]">
            Compares against the cheapest all-in price across providers.
          </p>
        </div>

        <div>
          <label htmlFor="pct" className="label">
            Or any drop over
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="pct"
              inputMode="numeric"
              value={pctDrop}
              onChange={(event) => setPctDrop(event.target.value)}
              className="border-line text-text h-9 w-20 border bg-transparent px-2 font-mono text-[14px] tabular-nums outline-none"
            />
            <span className="text-text-dim font-mono text-[13px]">%</span>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="label mb-1">Also notify me when</legend>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={onPriceDrop}
              onChange={(event) => setOnPriceDrop(event.target.checked)}
              style={{ accentColor: "var(--volt)" }}
            />
            The price drops
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={onNewTickets}
              onChange={(event) => setOnNewTickets(event.target.checked)}
              style={{ accentColor: "var(--volt)" }}
            />
            New tickets get listed
          </label>
        </fieldset>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => submit("upsert")}
            disabled={busy || settings === null}
          >
            {busy ? (
              <Loader2 className="animate-spin" size={13} />
            ) : (
              <BellRing size={13} />
            )}
            {settings?.tracked ? "Update alert" : "Set alert"}
          </Button>
          {settings?.tracked ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => submit("remove")}
              disabled={busy}
            >
              <Trash2 size={13} />
              Remove
            </Button>
          ) : null}
          {saved ? (
            <span className="text-volt font-mono text-[11px] tracking-[0.1em] uppercase">
              {saved}
            </span>
          ) : null}
          {error ? (
            <span className="text-red font-mono text-[11px]">{error}</span>
          ) : null}
        </div>

        <p className="text-text-dim border-line-soft border-t pt-3 text-[11px]">
          Free plan: at most one email per game every 6 hours.
        </p>
      </div>
    </div>
  );
}
