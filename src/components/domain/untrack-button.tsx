"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

/** Removes a tracked-game alert from the /alerts dashboard. */
export function UntrackButton({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={busy}
      onClick={() =>
        startTransition(async () => {
          try {
            await fetch("/api/tracked-games", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ gameId, action: "remove" }),
            });
            router.refresh();
          } catch {
            // Non-fatal: the row simply stays until the next attempt.
          }
        })
      }
    >
      <Trash2 size={13} />
      Remove
    </Button>
  );
}
