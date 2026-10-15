// সেকশন ৪১: Finance-এর হিসাব (ডাটাবেস ছাড়া, তাই সহজে টেস্ট করা যায়)

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// মোট আর পরিশোধ দেখে ইনভয়েসের অবস্থা
export function paymentStatus(total: number, paid: number): "POSTED" | "PARTIALLY_PAID" | "PAID" {
  if (paid <= 0) return "POSTED";
  return paid >= total ? "PAID" : "PARTIALLY_PAID";
}

// ইনভয়েসের subtotal আর PO/GRN-এর প্রত্যাশিত মান মেলানো (সহনসীমা শতাংশে)
export function matchInvoice(invoiceSubtotal: number, expected: number, tolerancePct = 1) {
  const diff = round2(invoiceSubtotal - expected);
  const allowed = round2((expected * tolerancePct) / 100);
  return { diff, matched: Math.abs(diff) <= allowed };
}

// Revenue − Cost = Gross Margin
export function grossMargin(revenue: number, cost: number) {
  const margin = round2(revenue - cost);
  return {
    revenue: round2(revenue),
    cost: round2(cost),
    margin,
    marginPct: revenue > 0 ? round2((margin / revenue) * 100) : null,
  };
}