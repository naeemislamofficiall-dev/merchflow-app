// ---------- Costing (সেকশন ১২) ----------

type CostLine = {
  consumption: number;
  unitPrice: number;
  wastagePct: number;
};

// একটা আইটেমের খরচ = ব্যবহার × (১ + অপচয়%) × দাম
export function costItemAmount(line: CostLine): number {
  const withWastage = line.consumption * (1 + line.wastagePct / 100);
  return round(withWastage * line.unitPrice, 4);
}

// মোট খরচ আর মার্জিন সহ কোট করা দাম
export function costSheetTotals(lines: CostLine[], marginPct: number) {
  const totalCost = round(
    lines.reduce((sum, l) => sum + costItemAmount(l), 0),
    4
  );
  const quotedPrice = round(totalCost * (1 + marginPct / 100), 4);
  return { totalCost, quotedPrice };
}

// ---------- BOM ও MRP (সেকশন ১৩, ১৪) ----------

type BomLine = {
  consumption: number;
  wastagePct: number;
};

// অর্ডারের পরিমাণ অনুযায়ী মোট কত মালামাল লাগবে
export function grossRequirement(line: BomLine, orderQty: number): number {
  return round(orderQty * line.consumption * (1 + line.wastagePct / 100), 4);
}

// নেট = মোট দরকার − স্টক − আসন্ন সরবরাহ + সংরক্ষিত স্টক (ঋণাত্মক হবে না)
export function netRequirement(
  gross: number,
  stock: number,
  incoming = 0,
  reserved = 0
): number {
  return round(Math.max(gross - stock - incoming + reserved, 0), 4);
}

// ---------- T&A (সেকশন ১১) ----------

type TemplateTask = { name: string; daysBefore: number; sortOrder: number };

// শিপমেন্টের তারিখ থেকে পেছনের দিকে গুনে প্রতিটা কাজের তারিখ বের করে
export function buildTnaTasks(shipDate: Date, tasks: TemplateTask[]) {
  return tasks.map((t) => {
    const planned = new Date(shipDate);
    planned.setDate(planned.getDate() - t.daysBefore);
    return { name: t.name, plannedDate: planned, sortOrder: t.sortOrder };
  });
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}