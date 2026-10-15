"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SiteHeader() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <header className="border-b border-line bg-ink">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-volt font-display text-[13px] leading-none font-bold text-ink">
            FT
          </span>
          <span className="font-display text-[17px] font-bold uppercase tracking-tight">
            FanTicket Hub
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <span className="label">NFL &amp; NBA price intelligence</span>
          <Link
            href="/alerts"
            className="text-[12px] uppercase tracking-[0.1em] text-text-dim transition-colors duration-150 hover:text-volt"
          >
            Alerts
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isPending ? (
            <span className="h-7 w-24 rounded-sm border border-line-soft" />
          ) : session ? (
            <>
              <span className="hidden font-mono text-[11px] text-text-dim sm:inline">
                {session.user.email}
              </span>
              <button
                type="button"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
                onClick={() => {
                  void authClient.signOut({
                    fetchOptions: { onSuccess: () => window.location.reload() },
                  });
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className={buttonVariants({ variant: "primary", size: "sm" })}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
