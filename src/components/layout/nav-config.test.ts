import { describe, expect, it } from "vitest";
import { NAV } from "./nav-config";

describe("nav-config", () => {
  it("has no duplicate hrefs across all groups", () => {
    const seen = new Map<string, string>();
    for (const g of NAV) {
      for (const i of g.items) {
        expect(seen.has(i.href), `duplicate href ${i.href} (${g.label} / ${seen.get(i.href)})`).toBe(false);
        seen.set(i.href, g.label);
      }
    }
  });
});
