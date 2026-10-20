// ক্লায়েন্ট আর সার্ভার দুই জায়গায় ব্যবহার হয়, তাই prisma import নেই
export const DOC_TYPES = [
  "LC",
  "BACK_TO_BACK_LC",
  "PI",
  "COMMERCIAL_INVOICE",
  "PACKING_LIST",
  "EXP",
  "SHIPPING_INSTRUCTION",
  "FORWARDER_HANDOVER",
  "CNF_HANDOVER",
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  LC: "LC",
  BACK_TO_BACK_LC: "Back-to-back LC",
  PI: "Proforma invoice",
  COMMERCIAL_INVOICE: "Commercial invoice",
  PACKING_LIST: "Packing list",
  EXP: "EXP form",
  SHIPPING_INSTRUCTION: "Shipping instruction",
  FORWARDER_HANDOVER: "Forwarder handover",
  CNF_HANDOVER: "C&F handover",
};