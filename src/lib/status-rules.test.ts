import { describe, expect, it } from "vitest";
import * as rules from "./status-rules";
import {
  assertTransition,
  canTransition,
  orderTransitions,
  productionTransitions,
  sampleTransitions,
  shipmentTransitions,
  type TransitionMap,
} from "./status-rules";

describe("canTransition / assertTransition", () => {
  it("allows a listed transition", () => {
    expect(canTransition(orderTransitions, "DRAFT", "CONFIRMED")).toBe(true);
    expect(() => assertTransition(orderTransitions, "DRAFT", "CONFIRMED")).not.toThrow();
  });

  it("blocks arbitrary status jumps (spec Sec 58)", () => {
    expect(canTransition(orderTransitions, "DRAFT", "IN_PRODUCTION")).toBe(false);
    expect(() => assertTransition(orderTransitions, "DRAFT", "IN_PRODUCTION")).toThrow(
      "Status change not allowed: DRAFT"
    );
  });

  it("unknown from-status is not allowed", () => {
    expect(canTransition(orderTransitions, "NOPE", "CONFIRMED")).toBe(false);
  });
});

describe("key flows", () => {
  it("closed order cannot move (rule 9)", () => {
    expect(orderTransitions.CLOSED).toEqual([]);
    expect(canTransition(orderTransitions, "CLOSED", "CONFIRMED")).toBe(false);
  });

  it("order can be cancelled only from CONFIRMED", () => {
    expect(canTransition(orderTransitions, "CONFIRMED", "CANCELLED")).toBe(true);
    expect(canTransition(orderTransitions, "IN_PRODUCTION", "CANCELLED")).toBe(false);
  });

  it("sample: rejected goes to revision, then resent", () => {
    expect(canTransition(sampleTransitions, "BUYER_REVIEW", "REJECTED")).toBe(true);
    expect(canTransition(sampleTransitions, "REJECTED", "REVISION")).toBe(true);
    expect(canTransition(sampleTransitions, "REVISION", "SENT")).toBe(true);
    expect(sampleTransitions.APPROVED).toEqual([]);
  });

  it("production cannot jump from PLANNED to COMPLETED", () => {
    expect(canTransition(productionTransitions, "PLANNED", "COMPLETED")).toBe(false);
    expect(canTransition(productionTransitions, "IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("shipment cannot ship before booking", () => {
    expect(canTransition(shipmentTransitions, "PLANNED", "SHIPPED")).toBe(false);
    expect(canTransition(shipmentTransitions, "BOOKED", "SHIPPED")).toBe(true);
  });
});

// Shob transition map-er integrity: target status-gulo map-er nijer key hote hobe
describe("all transition maps are consistent", () => {
  const maps = Object.entries(rules).filter(
    ([, v]) => typeof v === "object" && v !== null
  ) as [string, TransitionMap][];

  it("finds the maps", () => {
    expect(maps.length).toBeGreaterThan(10);
  });

  for (const [name, map] of maps) {
    it(`${name}: every target is a defined status`, () => {
      const keys = new Set(Object.keys(map));
      for (const [from, targets] of Object.entries(map)) {
        for (const to of targets) {
          expect(keys.has(to), `${name}: ${from} → ${to} (target not a key)`).toBe(true);
        }
      }
    });
  }
});
