// খরচের খাত (স্কিমার CostCategory enum-এর সাথে মেলানো)
export const COST_CATEGORIES = [
  "FABRIC",
  "YARN",
  "TRIM",
  "CM",
  "WASH",
  "PRINT_EMB",
  "PACKING",
  "TESTING",
  "OVERHEAD",
  "COMMERCIAL",
  "COMMISSION",
  "FREIGHT",
  "OTHER",
] as const;

export type CostCategoryName = (typeof COST_CATEGORIES)[number];

export const categoryLabel = (c: string) => c.replace(/_/g, " ");