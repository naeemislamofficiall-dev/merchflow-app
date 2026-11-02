import { describe, expect, it } from "vitest";
import { InMemoryRateLimiter, checkRateLimits, clientIp, rateLimitKeys } from "./rate-limit";

describe("InMemoryRateLimiter", () => {
  it("limit porjonto allow, tarpor block", () => {
    const rl = new InMemoryRateLimiter(3, 60_000);
    const t = 1_000_000;
    expect(rl.check("k", t).allowed).toBe(true);
    expect(rl.check("k", t).allowed).toBe(true);
    const third = rl.check("k", t);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
    const fourth = rl.check("k", t);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSec).toBe(60);
  });

  it("window shesh hole reset", () => {
    const rl = new InMemoryRateLimiter(1, 10_000);
    const t = 5_000_000;
    expect(rl.check("k", t).allowed).toBe(true);
    expect(rl.check("k", t + 1_000).allowed).toBe(false);
    expect(rl.check("k", t + 10_000).allowed).toBe(true);
  });

  it("key alada alada count hoy", () => {
    const rl = new InMemoryRateLimiter(1, 10_000);
    expect(rl.check("a", 1).allowed).toBe(true);
    expect(rl.check("b", 1).allowed).toBe(true);
    expect(rl.check("a", 2).allowed).toBe(false);
  });

  it("maxKeys-er beshi memory nei", () => {
    const rl = new InMemoryRateLimiter(5, 10_000, 10);
    for (let i = 0; i < 50; i++) rl.check(`k${i}`, 1_000);
    expect(rl.size).toBeLessThanOrEqual(10);
  });

  it("expired bucket prune hoy", () => {
    const rl = new InMemoryRateLimiter(5, 1_000, 3);
    for (let i = 0; i < 3; i++) rl.check(`old${i}`, 0);
    rl.check("new", 5_000);
    expect(rl.size).toBeLessThanOrEqual(3);
  });
});

describe("checkRateLimits (user + IP)", () => {
  it("rateLimitKeys: user thakle duita key", () => {
    expect(rateLimitKeys("u1", "1.2.3.4")).toEqual(["ip:1.2.3.4", "user:u1"]);
    expect(rateLimitKeys(null, "1.2.3.4")).toEqual(["ip:1.2.3.4"]);
  });

  it("ek user onno IP theke ghuriye limit pere jay na (user key-te dhora porbe)", () => {
    const rl = new InMemoryRateLimiter(2, 60_000);
    const t = 10;
    expect(checkRateLimits(rl, rateLimitKeys("u1", "1.1.1.1"), t).allowed).toBe(true);
    expect(checkRateLimits(rl, rateLimitKeys("u1", "2.2.2.2"), t).allowed).toBe(true);
    expect(checkRateLimits(rl, rateLimitKeys("u1", "3.3.3.3"), t).allowed).toBe(false);
  });

  it("onno user alada", () => {
    const rl = new InMemoryRateLimiter(1, 60_000);
    expect(checkRateLimits(rl, rateLimitKeys("u1", "9.9.9.9"), 1).allowed).toBe(true);
    // IP key shared, tai onno user-o IP limit-e atke
    expect(checkRateLimits(rl, rateLimitKeys("u2", "9.9.9.9"), 1).allowed).toBe(false);
    expect(checkRateLimits(rl, rateLimitKeys("u3", "8.8.8.8"), 1).allowed).toBe(true);
  });
});

describe("clientIp", () => {
  const h = (m: Record<string, string>) => ({ get: (n: string) => m[n] ?? null });
  it("x-forwarded-for-er prothom IP", () => {
    expect(clientIp(h({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });
  it("x-real-ip fallback, tarpor unknown", () => {
    expect(clientIp(h({ "x-real-ip": "7.7.7.7" }))).toBe("7.7.7.7");
    expect(clientIp(h({}))).toBe("unknown");
  });
});