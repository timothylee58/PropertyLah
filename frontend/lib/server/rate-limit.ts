/**
 * Minimal in-memory rate limiting for the dashboard's API routes.
 *
 * Fixed-window counter per (bucket, client IP). Good enough to blunt scraping
 * and retry storms on a single server instance; it resets on cold start and
 * does not coordinate across instances/regions — on Vercel that means each
 * lambda instance has its own counter, so the effective limit scales with
 * concurrent instances. Swap for a shared store (Upstash Redis, etc.) before
 * relying on this as a hard cap.
 */

const WINDOW_MS = 60_000;

const counters = new Map<string, { windowStart: number; count: number }>();

export function checkRateLimit(bucket: string, clientKey: string, limitPerMinute: number): boolean {
  const key = `${bucket}:${clientKey}`;
  const now = Date.now();
  const entry = counters.get(key);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    counters.set(key, { windowStart: now, count: 1 });
    return true;
  }

  entry.count += 1;
  return entry.count <= limitPerMinute;
}

export function resetRateLimits(): void {
  counters.clear();
}
