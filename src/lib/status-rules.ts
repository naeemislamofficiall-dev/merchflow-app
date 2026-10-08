// কোন status থেকে কোন status-এ যাওয়া যাবে তার তালিকা
export type TransitionMap = Record<string, string[]>;

export const enquiryTransitions: TransitionMap = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["QUOTED", "CANCELLED"],
  QUOTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: [],
  CANCELLED: [],
};

export const styleTransitions: TransitionMap = {
  DRAFT: ["DEVELOPMENT", "ARCHIVED"],
  DEVELOPMENT: ["APPROVED", "ARCHIVED"],
  APPROVED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransition(map: TransitionMap, from: string, to: string) {
  return map[from]?.includes(to) ?? false;
}

// নিয়ম না মানলে এরর দেয়
export function assertTransition(map: TransitionMap, from: string, to: string) {
  if (!canTransition(map, from, to)) {
    throw new Error(`Status change not allowed: ${from} → ${to}`);
  }
}

export const sampleTransitions: TransitionMap = {
  REQUESTED: ["IN_DEVELOPMENT", "CANCELLED"],
  IN_DEVELOPMENT: ["INTERNAL_QC", "CANCELLED"],
  INTERNAL_QC: ["SENT", "IN_DEVELOPMENT"], // QC-তে আটকালে আবার বানানো যাবে
  SENT: ["BUYER_REVIEW"],
  BUYER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: ["REVISION"],
  REVISION: ["SENT"], // সংশোধনের পর আবার পাঠানো (Resent)
  CANCELLED: [],
};

export const costSheetTransitions: TransitionMap = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: ["DRAFT"],
};

export const bomTransitions: TransitionMap = {
  DRAFT: ["APPROVED"],
  APPROVED: ["ARCHIVED"],
  ARCHIVED: [],
};

export const orderTransitions: TransitionMap = {
  DRAFT: ["CONFIRMED"],
  CONFIRMED: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["PARTIALLY_SHIPPED", "FULLY_SHIPPED"],
  PARTIALLY_SHIPPED: ["FULLY_SHIPPED"],
  FULLY_SHIPPED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export const prTransitions: TransitionMap = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PO_CREATED", "CANCELLED"],
  PO_CREATED: ["CLOSED"],
  CLOSED: [],
  REJECTED: ["DRAFT"],
  CANCELLED: [],
};

export const poTransitions: TransitionMap = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "REJECTED"],
  APPROVED: ["SENT", "CANCELLED"],
  SENT: ["ACKNOWLEDGED", "CANCELLED"],
  ACKNOWLEDGED: ["PARTIAL_RECEIPT", "COMPLETE", "CANCELLED"],
  PARTIAL_RECEIPT: ["COMPLETE"],
  COMPLETE: ["CLOSED"],
  CLOSED: [],
  REJECTED: ["REVISION"],
  REVISION: ["SUBMITTED"], // সংশোধনের পর আবার জমা (Resubmit)
  CANCELLED: [],
};

export const rfqTransitions: TransitionMap = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["CLOSED", "CANCELLED"],
  CLOSED: [],
  CANCELLED: [],
};