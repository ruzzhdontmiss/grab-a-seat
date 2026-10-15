"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SiteHeader() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <header className="border-line bg-ink border-b">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="bg-volt font-display text-ink flex h-6 w-6 items-center justify-center rounded-[3px] text-[13px] leading-none font-bold">
            FT
          </span>
          <span className="font-display text-[17px] font-bold tracking-tight uppercase">
            FanTicket Hub
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <span className="label">NFL &amp; NBA price intelligence</span>
          <Link
            href="/alerts"
            className="text-text-dim hover:text-volt text-[12px] tracking-[0.1em] uppercase transition-colors duration-150"
          >
            Alerts
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isPending ? (
            <span className="border-line-soft h-7 w-24 rounded-sm border" />
          ) : session ? (
            <>
              <span className="text-text-dim hidden font-mono text-[11px] sm:inline">
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
