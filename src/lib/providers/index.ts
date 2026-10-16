/**
 * Provider registry (roadmap §3). Single place that knows every provider.
 */

import type { ProviderId, TicketProvider } from "./base";
import { createDeeplinkProvider, DEEPLINK_CONFIGS } from "./deeplink";
import { createSeatGeekProvider } from "./seatgeek";
import { createTicketmasterProvider } from "./ticketmaster";

export const PROVIDER_IDS = [
  "seatgeek",
  "ticketmaster",
  "stubhub",
  "vividseats",
  "tickpick",
  "gametime",
] as const satisfies readonly ProviderId[];

/** Inventory providers carry prices; deeplink providers are CTAs only. */
export const INVENTORY_PROVIDER_IDS = ["seatgeek", "ticketmaster"] as const;
export const DEEPLINK_PROVIDER_IDS = [
  "stubhub",
  "vividseats",
  "tickpick",
  "gametime",
] as const;

let cached: TicketProvider[] | null = null;

export function allProviders(): TicketProvider[] {
  if (!cached) {
    cached = [
      createSeatGeekProvider(),
      createTicketmasterProvider(),
      ...DEEPLINK_CONFIGS.map(createDeeplinkProvider),
    ];
  }
  return cached;
}

export function getProvider(id: string): TicketProvider | null {
  return allProviders().find((provider) => provider.id === id) ?? null;
}

export function inventoryProviders(): TicketProvider[] {
  return allProviders().filter((provider) => provider.type === "inventory");
}

export function deeplinkProviders(): TicketProvider[] {
  return allProviders().filter((provider) => provider.type === "deeplink");
}

/** Providers shown in the game-page comparison table, in display order. */
export function comparisonProviders(): TicketProvider[] {
  return allProviders();
}

export function providerName(id: string): string {
  return getProvider(id)?.name ?? id;
}

/** True when any inventory provider is serving fixtures instead of a live API. */
export function anyInventoryProviderMocked(): boolean {
  return inventoryProviders().some((provider) => provider.usesMock());
}

export * from "./base";
