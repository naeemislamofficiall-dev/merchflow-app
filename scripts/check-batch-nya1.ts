import assert from "node:assert/strict";
import { grossMargin, matchInvoice, paymentStatus, round2 } from "../src/lib/finance-calc";

assert.equal(round2(10.456), 10.46);

// Payment status
assert.equal(paymentStatus(1000, 0), "POSTED");
assert.equal(paymentStatus(1000, 400), "PARTIALLY_PAID");
assert.equal(paymentStatus(1000, 1000), "PAID");

// PO/GRN মেলানো (১% সহনসীমা)
assert.equal(matchInvoice(1005, 1000).matched, true);
assert.equal(matchInvoice(1020, 1000).matched, false);
assert.equal(matchInvoice(1020, 1000).diff, 20);

// Gross margin
assert.deepEqual(grossMargin(1000, 800), { revenue: 1000, cost: 800, margin: 200, marginPct: 20 });
assert.equal(grossMargin(0, 50).marginPct, null);

console.log("Finance checks passed");