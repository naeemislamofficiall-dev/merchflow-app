import { describe, expect, it } from "vitest";
import { elapsedMs, errorMessage, formatOutcome, isJobKey, JOB_KEYS, JOB_LABELS } from "./job-result";

describe("job keys", () => {
  it("every key has a label", () => {
    for (const k of JOB_KEYS) expect(JOB_LABELS[k]).toBeTruthy();
  });
  it("isJobKey accepts known keys only", () => {
    expect(isJobKey("daily-kpi-snapshot")).toBe(true);
    expect(isJobKey("drop-database")).toBe(false);
  });
});

describe("formatOutcome", () => {
  it("joins counts", () => {
    expect(formatOutcome({ alerts: 3, skipped: 1 })).toBe("alerts: 3, skipped: 1");
  });
  it("empty means nothing to do", () => {
    expect(formatOutcome({})).toBe("Nothing to do");
  });
});

describe("errorMessage", () => {
  it("handles Error, string and unknown", () => {
    expect(errorMessage(new Error("  boom "))).toBe("boom");
    expect(errorMessage("plain")).toBe("plain");
    expect(errorMessage(undefined)).toBe("Unknown error");
    expect(errorMessage({ code: 1 })).toBe('{"code":1}');
  });
  it("truncates long messages to max length", () => {
    const out = errorMessage("x".repeat(50), 10);
    expect(out.length).toBe(10);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("elapsedMs", () => {
  it("is never negative", () => {
    expect(elapsedMs(new Date(1000), new Date(3500))).toBe(2500);
    expect(elapsedMs(new Date(3500), new Date(1000))).toBe(0);
  });
});