import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Alerts" };

// Session + user row are per-request.
export const dynamic = "force-dynamic";

/**
 * Phase 0 placeholder: proves the session middleware + better-auth wiring work
 * end-to-end. The real tracked-games dashboard lands in Phase 1.
 */
export default async function AlertsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login?next=/alerts");
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="label">Signed in</p>
        <h1 className="mt-3 text-4xl">Your alerts board</h1>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <Badge variant="volt">active</Badge>
        </CardHeader>
        <CardBody className="space-y-3 font-mono text-[13px] tabular-nums">
          <Row label="Email" value={session.user.email} />
          <Row label="Name" value={session.user.name} />
          <Row
            label="Plan"
            value={(session.user as { plan?: string }).plan ?? "free"}
          />
          <Row
            label="Mock mode"
            value={env.MOCK_PROVIDERS.length > 0 ? "forced" : "auto"}
          />
        </CardBody>
      </Card>

      <p className="max-w-xl text-[13px] text-text-dim">
        Tracked games, team follows and the alert history feed arrive in Phase 1.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-line-soft pb-2 last:border-0 last:pb-0">
      <span className="label">{label}</span>
      <span className="text-text">{value}</span>
    </div>
  );
}
