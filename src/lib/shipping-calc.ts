// সেকশন ৩৯: Order Qty − Shipped Qty = Balance Qty

export function shipmentBalance(ordered: number, shipped: number) {
  return { ordered, shipped, balance: ordered - shipped };
}

// Shipment যাওয়ার পর অর্ডারের নতুন অবস্থা। কিছু না গেলে null।
export function orderStatusAfterShipment(ordered: number, shipped: number) {
  if (shipped <= 0) return null;
  return shipped >= ordered ? ("FULLY_SHIPPED" as const) : ("PARTIALLY_SHIPPED" as const);
}

// Carton-এর আয়তন (ঘনমিটার)
export function cartonCbm(l: number, w: number, h: number): number {
  return Math.round(((l * w * h) / 1_000_000) * 1000) / 1000;
}