import assert from "node:assert/strict";
import {
  emptyFunnel,
  funnelErrors,
  hourEfficiency,
  subcontractBalance,
  summarizeHours,
  wipBalances,
} from "../src/lib/production-calc";

// সেকশন ২৯: স্পেকের টেবিল
assert.equal(hourEfficiency(450, 420), 93.3);
assert.equal(hourEfficiency(450, 460), 102.2);
assert.equal(hourEfficiency(0, 10), null);

const s = summarizeHours([
  { target: 450, output: 420, reject: 10, rework: 5, downtimeMinutes: 0 },
  { target: 450, output: 460, reject: 0, rework: 2, downtimeMinutes: 15 },
]);
assert.equal(s.target, 900);
assert.equal(s.output, 880);
assert.equal(s.efficiencyPct, 97.8);
assert.equal(s.rejectPct, 1.1);
assert.equal(s.downtimeMinutes, 15);

// সেকশন ৩০: স্পেকের Order 1024 উদাহরণ
const b = wipBalances({ orderQty: 20000, cut: 18000, sewn: 15500, finished: 11200, packed: 8400, shipped: 0 });
assert.deepEqual(b, { toCut: 2000, inSewing: 2500, inFinishing: 4300, toPack: 2800, toShip: 8400 });

// সেকশন ৩১
assert.equal(subcontractBalance({ sent: 1000, received: 900, damage: 20, reject: 30 }), 50);

// সেকশন ৩২: ফানেল
const ok = { ...emptyFunnel(), input: 100, threadCut: 100, ironed: 90, folded: 90, metalChecked: 90, qcPassed: 85, output: 85 };
assert.deepEqual(funnelErrors(ok, 100), []);
assert.equal(funnelErrors({ ...ok, output: 86 }, 100).length, 1); // output > qcPassed
assert.equal(funnelErrors(ok, 90).length, 1); // input > sewing output

console.log("OK  ধাপ ছ-র হিসাব (efficiency, WIP, subcontract balance, finishing ফানেল)");