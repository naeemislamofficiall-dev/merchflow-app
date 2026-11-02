// Simple in-memory fixed-window rate limiter.
// LIMITATION: Redis nai, tai counter shudhu ei process-er memory-te thake.
// Multi-instance / serverless deploy-e instance-gulo counter share kore na, restart-e reset hoy.
// Pore Redis ashle ei file-er check() replace korlei hobe.

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
};

type Bucket = { count: number; resetAt: number };

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys: number = 5000,
  ) {}

  check(key: string, now: number = Date.now()): RateLimitResult {
    let b = this.buckets.get(key);
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(key, b);
      this.prune(now);
    }
    b.count += 1;
    const allowed = b.count <= this.limit;
    return {
      allowed,
      limit: this.limit,
      remaining: Math.max(0, this.limit - b.count),
      retryAfterSec: allowed ? 0 : Math.ceil((b.resetAt - now) / 1000),
    };
  }

  // Memory bere na jay: expired muchhe dao, tarpor shobcheye purano
  private prune(now: number): void {
    if (this.buckets.size <= this.maxKeys) return;
    for (const [k, v] of this.buckets) {
      if (v.resetAt <= now) this.buckets.delete(k);
    }
    while (this.buckets.size > this.maxKeys) {
      const first = this.buckets.keys().next().value;
      if (first === undefined) break;
      this.buckets.delete(first);
    }
  }

  get size(): number {
    return this.buckets.size;
  }

  reset(): void {
    this.buckets.clear();
  }
}

// Per user + per IP, duitai check hoy. Kono ekta blocked hole blocked.
export function rateLimitKeys(userId: string | null | undefined, ip: string): string[] {
  const keys = [`ip:${ip}`];
  if (userId) keys.push(`user:${userId}`);
  return keys;
}

export function checkRateLimits(limiter: InMemoryRateLimiter, keys: string[], now: number = Date.now()): RateLimitResult {
  const results = keys.map((k) => limiter.check(k, now));
  const blocked = results.filter((r) => !r.allowed);
  if (blocked.length > 0) {
    return blocked.reduce((a, b) => (b.retryAfterSec > a.retryAfterSec ? b : a));
  }
  return results.reduce((a, b) => (b.remaining < a.remaining ? b : a));
}

// NOTE: x-forwarded-for client banate pare (spoof). Reverse proxy trusted hole tar header-i source of truth.
// Tai user-based limit-i main, IP limit extra.
export function clientIp(headers: { get(name: string): string | null }): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}