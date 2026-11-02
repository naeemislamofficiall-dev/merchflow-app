import { describe, expect, it } from "vitest";
import { certStatus } from "./cert-status";

const now = new Date("2026-10-28T10:00:00Z");
describe("certStatus", () => {
  it("expired", () => expect(certStatus(new Date("2026-10-27"), now)).toEqual({ status: "EXPIRED", daysLeft: -1 }));
  it("expires today is still expiring", () => expect(certStatus(new Date("2026-10-28"), now).status).toBe("EXPIRING"));
  it("30 days is expiring", () => expect(certStatus(new Date("2026-11-27"), now).status).toBe("EXPIRING"));
  it("31 days is valid", () => expect(certStatus(new Date("2026-11-28"), now).status).toBe("VALID"));
});
