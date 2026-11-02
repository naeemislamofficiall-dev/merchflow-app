// Pure textile calculations (no DB), so they can be unit tested.

const round4 = (n: number) => Math.round(n * 10000) / 10000;

// Yarn needed for a planned fabric quantity, with knitting wastage on top.
export function yarnRequired(plannedFabricQty: number, wastagePct: number): number {
  if (plannedFabricQty < 0 || wastagePct < 0) throw new Error("Quantity and wastage cannot be negative");
  return round4(plannedFabricQty * (1 + wastagePct / 100));
}

// Process loss % = what went in but did not come out as good output or counted reject.
export function processLossPct(input: number, output: number, reject: number): number {
  if (input <= 0) return 0;
  const loss = input - output - reject;
  return round4((Math.max(loss, 0) / input) * 100);
}

// Good output + reject can never be more than what went in.
export function outputWithinInput(input: number, output: number, reject: number, eps = 0.00005): boolean {
  return output >= 0 && reject >= 0 && output + reject <= input + eps;
}

// Yarn still waiting to be issued for a knitting order.
export function yarnBalance(required: number, issued: number): number {
  return round4(Math.max(required - issued, 0));
}

// Knitting actual qty (good rolls) + reject must stay within yarn issued.
export function knittingOutputOk(yarnIssued: number, actual: number, reject: number): boolean {
  return outputWithinInput(yarnIssued, actual, reject);
}

// Bulk dyeing is allowed only when the lab dip is approved (or already in bulk dyeing).
export function canStartBulkDyeing(labDipStatus: string): boolean {
  return labDipStatus === "APPROVED" || labDipStatus === "BULK_DYEING";
}

// Rejected lab dip goes back to dyeing: that is a new submission round.
export function nextResubmissionCount(current: number): number {
  return current + 1;
}

// Submission round number: round 1 is the first submission.
export function nextSubmissionRound(existingRounds: number): number {
  return existingRounds + 1;
}