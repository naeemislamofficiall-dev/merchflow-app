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

// ---------- PO (সেকশন ১৮) ----------

type PoLine = { quantity: number; rate: number; taxPct: number };

export function poTotals(lines: PoLine[]) {
  const subtotal = round(lines.reduce((s, l) => s + l.quantity * l.rate, 0), 2);
  const tax = round(
    lines.reduce((s, l) => s + l.quantity * l.rate * (l.taxPct / 100), 0),
    2
  );
  return { subtotal, tax, grandTotal: round(subtotal + tax, 2) };
}

// ---------- Supplier Follow-up (সেকশন ১৯) ----------

// প্রতিশ্রুত তারিখ পেরিয়ে গেলে কত দিন দেরি (আগে হলে ০)
export function delayDays(promised: Date, actualOrToday: Date = new Date()): number {
  const ms = actualOrToday.getTime() - promised.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function delayAlertMessage(
  supplierName: string,
  materialLabel: string,
  days: number,
  orderNo: string
): string {
  return `${supplierName} is ${days} days late on ${materialLabel} delivery for Order #${orderNo}.`;
}

// ---------- Quotation তুলনা (সেকশন ১৬) ----------

type QuoteInput = {
  id: string;
  unitPrice: number;
  leadTimeDays: number;
  qualityRating: number; // ০ থেকে ১০০
};

// দাম ৫০%, লিড টাইম ২৫%, গুণমান ২৫% (বদলাতে চাইলে weights পাস করুন)
export function scoreQuotations(
  quotes: QuoteInput[],
  weights = { price: 0.5, lead: 0.25, quality: 0.25 }
) {
  const minPrice = Math.min(...quotes.map((q) => q.unitPrice));
  const minLead = Math.min(...quotes.map((q) => q.leadTimeDays));
  return quotes
    .map((q) => {
      const priceScore = (minPrice / q.unitPrice) * 100;
      const leadScore = (minLead / q.leadTimeDays) * 100;
      const score =
        priceScore * weights.price +
        leadScore * weights.lead +
        q.qualityRating * weights.quality;
      return { id: q.id, score: round(score, 2) };
    })
    .sort((a, b) => b.score - a.score);
}

// ---------- Supplier Scorecard (সেকশন ১৫) ----------

type ScorecardStats = {
  deliveriesTotal: number;
  deliveriesOnTime: number;
  receivedQty: number;
  acceptedQty: number;
  posTotal: number;
  posCompleted: number;
};

function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : round((part / whole) * 100, 2);
}

export function supplierScorecard(s: ScorecardStats) {
  return {
    onTimeDeliveryPct: pct(s.deliveriesOnTime, s.deliveriesTotal),
    qualityAcceptancePct: pct(s.acceptedQty, s.receivedQty),
    rejectionPct: pct(s.receivedQty - s.acceptedQty, s.receivedQty),
    poCompletionPct: pct(s.posCompleted, s.posTotal),
  };
}