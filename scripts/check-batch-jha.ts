import assert from "node:assert/strict";
import { aqlResult, aqlSampleSize, defaultAccept, dhu, pareto } from "../src/lib/quality-calc";
import { cartonCbm, orderStatusAfterShipment, shipmentBalance } from "../src/lib/shipping-calc";

// DHU
assert.equal(dhu(5, 100), 5);
assert.equal(dhu(3, 40), 7.5);
assert.equal(dhu(0, 0), null);

// Defect Pareto
const p = pareto([
  { name: "Open seam", count: 30 },
  { name: "Broken stitch", count: 50 },
  { name: "Skip stitch", count: 20 },
  { name: "Open seam", count: 0 },
]);
assert.deepEqual(p.map((r) => r.name), ["Broken stitch", "Open seam", "Skip stitch"]);
assert.deepEqual(p.map((r) => r.cumulativePct), [50, 80, 100]);

// AQL নমুনা (Level II)
assert.equal(aqlSampleSize("II", 5), 2);
assert.equal(aqlSampleSize("II", 500), 50);
assert.equal(aqlSampleSize("II", 1000), 80);
assert.equal(aqlSampleSize("II", 3000), 125);
assert.equal(aqlSampleSize("II", 20000), 315);
assert.equal(aqlSampleSize("III", 5), 3);
assert.equal(aqlSampleSize("II", 1), 1); // নমুনা লটের বেশি হয় না

// Accept সংখ্যা
assert.equal(defaultAccept(2.5, 50), 3);
assert.equal(defaultAccept(2.5, 315), 14);
assert.equal(defaultAccept(4, 125), 14);
assert.equal(defaultAccept(4, 315), 21);
assert.equal(defaultAccept(0, 80), 0);
assert.equal(defaultAccept(1, 50), null); // বিল্ট-ইন নেই: হাতে দিতে হবে

// ফল
const base = { foundCritical: 0, foundMajor: 0, foundMinor: 0, rejectMajor: 15, rejectMinor: 22 };
assert.equal(aqlResult({ ...base, foundMajor: 14 }), "PASS");
assert.equal(aqlResult({ ...base, foundMajor: 15 }), "FAIL");
assert.equal(aqlResult({ ...base, foundMinor: 22 }), "FAIL");
assert.equal(aqlResult({ ...base, foundCritical: 1 }), "FAIL");

// Shipment balance (স্পেক: Order Qty − Shipped Qty = Balance)
assert.deepEqual(shipmentBalance(20000, 8400), { ordered: 20000, shipped: 8400, balance: 11600 });
assert.equal(orderStatusAfterShipment(20000, 0), null);
assert.equal(orderStatusAfterShipment(20000, 8400), "PARTIALLY_SHIPPED");
assert.equal(orderStatusAfterShipment(20000, 20000), "FULLY_SHIPPED");
assert.equal(orderStatusAfterShipment(20000, 20100), "FULLY_SHIPPED");
assert.equal(cartonCbm(60, 40, 40), 0.096);

console.log("OK  ধাপ জ ও ঝ-র হিসাব (DHU, Pareto, AQL, shipment balance)");