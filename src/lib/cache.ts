/**
 * Cache layer (roadmap §2, §5.3): Upstash Redis in front of provider calls.
 *
 * Implemented against the Upstash REST API with plain `fetch` — no extra SDK.
 * When `UPSTASH_REDIS_URL`/`UPSTASH_REDIS_TOKEN` are unset, it degrades to a
 * process-local in-memory map so `pnpm dev` still caches within a run.
 */

import { env } from "@/lib/env";

const DEFAULT_TTL_SECONDS = 600; // 10 min — within the §2 5–15 min window.

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

const memory = new Map<string, MemoryEntry>();

function redisConfigured(): boolean {
  return Boolean(env.UPSTASH_REDIS_URL && env.UPSTASH_REDIS_TOKEN);
}

/**
 * Run a single Redis command via the Upstash REST pipeline endpoint, which
 * accepts a JSON array of commands and returns an array of `{ result }`.
 */
async function redisCommand(command: string[]): Promise<unknown> {
  const response = await fetch(`${env.UPSTASH_REDIS_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.UPSTASH_REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([command]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash ${command[0]} failed: ${response.status}`);
  }

  const payload = (await response.json()) as Array<{ result?: unknown }>;
  return payload[0]?.result ?? null;
}

export async function cacheGet(key: string): Promise<string | null> {
  if (redisConfigured()) {
    const result = await redisCommand(["GET", key]);
    return typeof result === "string" ? result : null;
  }

  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  if (redisConfigured()) {
    await redisCommand(["SET", key, value, "EX", String(ttlSeconds)]);
    return;
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/**
 * Fetch JSON with a cache in front. A cache miss, a Redis outage, or a cache
 * write failure never breaks the caller — the fetch simply proceeds.
 */
export async function cachedJson<T>(
  key: string,
  url: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<T> {
  try {
    const hit = await cacheGet(key);
    if (hit) return JSON.parse(hit) as T;
  } catch {
    // Cache read failures are non-fatal.
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`GET ${url} -> ${response.status} ${response.statusText}`);
  }
  const json = (await response.json()) as T;

  try {
    await cacheSet(key, JSON.stringify(json), ttlSeconds);
  } catch {
    // Cache write failures are non-fatal.
  }

  return json;
}
