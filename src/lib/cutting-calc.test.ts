import { describe, expect, it } from "vitest";
import {
  layFabric,
  layPieces,
  markerEfficiency,
  markerUsage,
  piecesPerPly,
  ratioMatches,
} from "./cutting-calc";

const ratio = { S: 1, M: 2, L: 1 };

describe("marker basics", () => {
  it("pieces per ply is the ratio sum", () => {
    expect(piecesPerPly(ratio)).toBe(4);
  });
  it("lay pieces = ratio sum x plies", () => {
    expect(layPieces(ratio, 50)).toBe(200);
  });
  it("lay fabric = marker length x plies", () => {
    expect(layFabric(2.5, 50)).toBe(125);
  });
});

describe("marker efficiency (hand-calculated)", () => {
  it("4 pcs x 0.45 m2 on 150 cm x 1.25 m marker = 96%", () => {
    // marker area = 1.5 * 1.25 = 1.875; pieces area = 4 * 0.45 = 1.8; 1.8 / 1.875 = 96%
    expect(markerEfficiency(ratio, 0.45, 150, 1.25)).toBe(96);
  });
  it("is null when the marker area or piece area is 0", () => {
    expect(markerEfficiency(ratio, 0.45, 0, 1.25)).toBeNull();
    expect(markerEfficiency(ratio, 0, 150, 1.25)).toBeNull();
  });
});

describe("ratio match", () => {
  it("same ratio in a different key order matches", () => {
    expect(ratioMatches({ S: 1, M: 2, L: 1 }, { L: 1, S: 1, M: 2 })).toBe(true);
  });
  it("different number or size does not match", () => {
    expect(ratioMatches({ S: 1, M: 2 }, { S: 1, M: 3 })).toBe(false);
    expect(ratioMatches({ S: 1, M: 2 }, { S: 1, L: 2 })).toBe(false);
    expect(ratioMatches({ S: 1 }, { S: 1, M: 1 })).toBe(false);
  });
});

describe("marker usage across lays", () => {
  it("counts planned and cut separately, using actual plies when given", () => {
    const u = markerUsage(ratio, 2, [
      { plies: 50, actualPlies: 48, status: "CUT" },
      { plies: 30, status: "PLANNED" },
    ]);
    expect(u.plannedPlies).toBe(80);
    expect(u.cutPlies).toBe(48);
    expect(u.cutPieces).toBe(192);
    expect(u.plannedFabric).toBe(160);
    expect(u.cutFabric).toBe(96);
  });
});