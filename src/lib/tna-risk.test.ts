import { describe, expect, it } from "vitest";
import { classifyTask, delayDays } from "./tna-risk";

const d = (s: string) => new Date(s + "T00:00:00Z");
const now = d("2026-10-27");

describe("classifyTask", () => {
  it("completed is always OK", () => {
    expect(classifyTask({ status: "COMPLETED", plannedDate: d("2026-01-01"), revisedDate: null }, null, now)).toBe("OK");
  });
  it("past due without near ship date is OVERDUE", () => {
    expect(classifyTask({ status: "NOT_STARTED", plannedDate: d("2026-10-20"), revisedDate: null }, d("2027-03-01"), now)).toBe("OVERDUE");
  });
  it("past due with ship date soon is SHIPMENT_RISK", () => {
    expect(classifyTask({ status: "ON_TRACK", plannedDate: d("2026-10-20"), revisedDate: null }, d("2026-11-10"), now)).toBe("SHIPMENT_RISK");
  });
  it("revised date wins over planned date", () => {
    expect(classifyTask({ status: "NOT_STARTED", plannedDate: d("2026-10-01"), revisedDate: d("2026-12-01") }, null, now)).toBe("OK");
  });
  it("near due with open predecessor is AT_RISK", () => {
    expect(
      classifyTask({ status: "NOT_STARTED", plannedDate: d("2026-10-29"), revisedDate: null, dependsOnStatus: "ON_TRACK" }, null, now),
    ).toBe("AT_RISK");
  });
  it("near due with completed predecessor is OK", () => {
    expect(
      classifyTask({ status: "NOT_STARTED", plannedDate: d("2026-10-29"), revisedDate: null, dependsOnStatus: "COMPLETED" }, null, now),
    ).toBe("OK");
  });
});

describe("delayDays", () => {
  it("counts days past due", () => {
    expect(delayDays({ status: "NOT_STARTED", plannedDate: d("2026-10-24"), revisedDate: null }, now)).toBe(3);
  });
});
