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
  REQUESTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["SENT", "CANCELLED"],
  SENT: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: ["REQUESTED"], // নতুন করে আবার চাওয়া যাবে
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