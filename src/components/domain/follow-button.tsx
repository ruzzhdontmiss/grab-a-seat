"use client";

import { BellPlus, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/**
 * Follow / unfollow a team (roadmap §1.5).
 *
 * Reads its own state from `GET /api/follows` so league/team pages can stay
 * static (ISR) instead of being forced dynamic by `headers()`.
 */
export function FollowButton({
  teamId,
  nextPath,
  size = "sm",
  className,
}: {
  teamId: string;
  nextPath: string;
  size?: "sm" | "default";
  className?: string;
}) {
  const { data: session, isPending } = authClient.useSession();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/follows?teamId=${encodeURIComponent(teamId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const json = (await response.json()) as { following: boolean };
      setFollowing(json.following);
    } catch {
      setFollowing(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (!session) return;
    void load();
  }, [session, load]);

  if (isPending) {
    return (
      <span
        className={cn(
          "border-line-soft inline-block h-7 w-24 rounded-sm border",
          className,
        )}
      />
    );
  }

  if (!session) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(nextPath)}`}
        className={buttonVariants({ variant: "secondary", size, className })}
      >
        <BellPlus size={13} />
        Follow
      </Link>
    );
  }

  const toggle = () => {
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      try {
        const response = await fetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId, action: next ? "follow" : "unfollow" }),
        });
        if (!response.ok) {
          setFollowing(!next);
          return;
        }
        const json = (await response.json()) as { following: boolean };
        setFollowing(json.following);
        router.refresh();
      } catch {
        setFollowing(!next);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || following === null}
      aria-busy={following === null}
      className={buttonVariants({
        variant: following ? "secondary" : "primary",
        size,
        className,
      })}
    >
      {following ? <Check size={13} /> : <BellPlus size={13} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
