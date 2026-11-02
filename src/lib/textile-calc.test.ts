import { describe, expect, it } from "vitest";
import {
  canStartBulkDyeing,
  knittingOutputOk,
  nextResubmissionCount,
  nextSubmissionRound,
  outputWithinInput,
  processLossPct,
  yarnBalance,
  yarnRequired,
} from "./textile-calc";
import {
  dyeBatchTransitions,
  fabricFinishingTransitions,
  knittingTransitions,
  labDipTransitions,
  canTransition,
} from "./status-rules";

describe("textile-calc", () => {
  it("yarn required adds wastage", () => {
    expect(yarnRequired(100, 5)).toBe(105);
    expect(yarnRequired(100, 0)).toBe(100);
  });

  it("yarn required rejects negative input", () => {
    expect(() => yarnRequired(-1, 5)).toThrow();
  });

  it("process loss percent", () => {
    expect(processLossPct(100, 90, 4)).toBe(6);
    expect(processLossPct(0, 0, 0)).toBe(0);
    expect(processLossPct(100, 100, 5)).toBe(0);
  });

  it("output + reject cannot pass input", () => {
    expect(outputWithinInput(100, 95, 5)).toBe(true);
    expect(outputWithinInput(100, 96, 5)).toBe(false);
  });

  it("yarn balance never goes below zero", () => {
    expect(yarnBalance(105, 100)).toBe(5);
    expect(yarnBalance(105, 110)).toBe(0);
  });

  it("knitting output must stay within yarn issued", () => {
    expect(knittingOutputOk(100, 90, 8)).toBe(true);
    expect(knittingOutputOk(100, 95, 8)).toBe(false);
  });

  it("bulk dyeing needs an approved lab dip", () => {
    expect(canStartBulkDyeing("APPROVED")).toBe(true);
    expect(canStartBulkDyeing("BULK_DYEING")).toBe(true);
    expect(canStartBulkDyeing("REQUEST")).toBe(false);
    expect(canStartBulkDyeing("BUYER_REVIEW")).toBe(false);
    expect(canStartBulkDyeing("REJECTED")).toBe(false);
  });

  it("resubmission count and round increase by one", () => {
    expect(nextResubmissionCount(0)).toBe(1);
    expect(nextResubmissionCount(2)).toBe(3);
    expect(nextSubmissionRound(0)).toBe(1);
    expect(nextSubmissionRound(1)).toBe(2);
  });
});

describe("textile status rules", () => {
  it("lab dip follows the full flow", () => {
    const flow = ["REQUEST", "DYEING", "LAB_DIP", "BUYER_REVIEW", "APPROVED", "BULK_DYEING"];
    for (let i = 0; i < flow.length - 1; i++) {
      expect(canTransition(labDipTransitions, flow[i], flow[i + 1])).toBe(true);
    }
  });

  it("lab dip rejected goes back to dyeing, never straight to bulk", () => {
    expect(canTransition(labDipTransitions, "BUYER_REVIEW", "REJECTED")).toBe(true);
    expect(canTransition(labDipTransitions, "REJECTED", "DYEING")).toBe(true);
    expect(canTransition(labDipTransitions, "REJECTED", "BULK_DYEING")).toBe(false);
    expect(canTransition(labDipTransitions, "REQUEST", "BULK_DYEING")).toBe(false);
    expect(canTransition(labDipTransitions, "LAB_DIP", "APPROVED")).toBe(false);
  });

  it("knitting cannot skip yarn issue", () => {
    expect(canTransition(knittingTransitions, "PLANNED", "YARN_ISSUED")).toBe(true);
    expect(canTransition(knittingTransitions, "PLANNED", "COMPLETED")).toBe(false);
    expect(canTransition(knittingTransitions, "YARN_ISSUED", "CANCELLED")).toBe(false);
    expect(canTransition(knittingTransitions, "COMPLETED", "CLOSED")).toBe(true);
  });

  it("dye batch and finishing are one-way", () => {
    expect(canTransition(dyeBatchTransitions, "PLANNED", "IN_PROCESS")).toBe(true);
    expect(canTransition(dyeBatchTransitions, "PLANNED", "COMPLETED")).toBe(false);
    expect(canTransition(dyeBatchTransitions, "CLOSED", "IN_PROCESS")).toBe(false);
    expect(canTransition(fabricFinishingTransitions, "PLANNED", "IN_PROCESS")).toBe(true);
    expect(canTransition(fabricFinishingTransitions, "COMPLETED", "PLANNED")).toBe(false);
  });
});