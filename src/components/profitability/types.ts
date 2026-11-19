export type RangeKey = "all" | "this-month" | "last-month" | "90d" | "ytd";

export type BuyerRow = {
  buyerId: string;
  name: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
};

export type OrderRow = {
  orderId: string;
  orderNo: string;
  buyerName: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
};