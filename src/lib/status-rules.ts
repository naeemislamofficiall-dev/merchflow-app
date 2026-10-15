// কোন status থেকে কোন status-এ যাওয়া যাবে তার তালিকা
export type TransitionMap = Record<string, string[]>;

export function canTransition(map: TransitionMap, from: string, to: string) {
  return map[from]?.includes(to) ?? false;
}

// নিয়ম না মানলে এরর দেয়
export function assertTransition(map: TransitionMap, from: string, to: string) {
  if (!canTransition(map, from, to)) {
    throw new Error(`Status change not allowed: ${from} → ${to}`);
  }
}

// ---------- Enquiry (সেকশন ৭) ----------
export const enquiryTransitions: TransitionMap = {
  DRAFT: ["COSTING", "CANCELLED"],
  COSTING: ["NEGOTIATION", "CANCELLED"],
  NEGOTIATION: ["QUOTED", "CANCELLED"],
  QUOTED: ["APPROVED", "NEGOTIATION", "CANCELLED"], // বায়ার আবার দর চাইলে ফেরত যাওয়া যাবে
  APPROVED: ["CONVERTED", "CANCELLED"],
  CONVERTED: [],
  CANCELLED: [],
};

// ---------- Style (সেকশন ৮) ----------
export const styleTransitions: TransitionMap = {
  DRAFT: ["DEVELOPMENT", "ARCHIVED"],
  DEVELOPMENT: ["APPROVED", "ARCHIVED"],
  APPROVED: ["ARCHIVED"],
  ARCHIVED: [],
};

// ---------- Sample (সেকশন ১০) ----------
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

// ---------- Costing (সেকশন ১২) ----------
export const costSheetTransitions: TransitionMap = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: ["DRAFT"],
};

// ---------- BOM (সেকশন ১৩) ----------
export const bomTransitions: TransitionMap = {
  DRAFT: ["APPROVED"],
  APPROVED: ["ARCHIVED"],
  ARCHIVED: [],
};

// ---------- Order ----------
export const orderTransitions: TransitionMap = {
  DRAFT: ["CONFIRMED"],
  CONFIRMED: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["PARTIALLY_SHIPPED", "FULLY_SHIPPED"],
  PARTIALLY_SHIPPED: ["FULLY_SHIPPED"],
  FULLY_SHIPPED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

// ---------- Purchase Requisition (সেকশন ১৭) ----------
export const prTransitions: TransitionMap = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PO_CREATED", "CANCELLED"],
  PO_CREATED: ["CLOSED"],
  CLOSED: [],
  REJECTED: ["DRAFT"],
  CANCELLED: [],
};

// ---------- Purchase Order (সেকশন ১৮) ----------
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

// ---------- RFQ (সেকশন ১৬) ----------
export const rfqTransitions: TransitionMap = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["CLOSED", "CANCELLED"],
  CLOSED: [],
  CANCELLED: [],
};



// ---------- Production Order (সেকশন ২৫, স্পেক ৫৮) ----------
export const productionTransitions: TransitionMap = {
  PLANNED: ["RELEASED", "CANCELLED"],
  RELEASED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["PAUSED", "COMPLETED"],
  PAUSED: ["IN_PROGRESS", "COMPLETED"],
  COMPLETED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

// ---------- Cut Plan (সেকশন ২৮) ----------
export const cutPlanTransitions: TransitionMap = {
  PLANNED: ["FABRIC_RESERVED", "CANCELLED"],
  FABRIC_RESERVED: ["CUTTING", "CANCELLED"],
  CUTTING: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

// ---------- Subcontract (সেকশন ৩১): Send → Vendor Receipt → Process → Return → QC ----------
export const subcontractTransitions: TransitionMap = {
  SENT: ["VENDOR_RECEIVED", "CANCELLED"],
  VENDOR_RECEIVED: ["IN_PROCESS"],
  IN_PROCESS: ["RETURNED"],
  RETURNED: ["QC_DONE"],
  QC_DONE: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

// ---------- CAPA (সেকশন ৩৬): Problem → Root Cause → Action → Verification → Closed ----------
export const capaTransitions: TransitionMap = {
  OPEN: ["ROOT_CAUSE", "CANCELLED"],
  ROOT_CAUSE: ["ACTION", "CANCELLED"],
  ACTION: ["VERIFICATION", "CANCELLED"],
  VERIFICATION: ["CLOSED", "ACTION"], // যাচাইয়ে না মিললে আবার কাজে ফেরত
  CLOSED: [],
  CANCELLED: [],
};

// ---------- Shipment (সেকশন ৩৯, স্পেক ৫৮) ----------
export const shipmentTransitions: TransitionMap = {
  DRAFT: ["PLANNED", "CANCELLED"],
  PLANNED: ["DOCUMENTS_READY", "CANCELLED"],
  DOCUMENTS_READY: ["BOOKED", "PLANNED", "CANCELLED"],
  BOOKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

// ---------- Finance (সেকশন ৪১) ----------
export const invoiceTransitions: TransitionMap = {
  DRAFT: ["POSTED", "CANCELLED"],
  POSTED: ["PARTIALLY_PAID", "PAID", "CANCELLED"],
  PARTIALLY_PAID: ["PAID"],
  PAID: [],
  CANCELLED: [],
};

export const expenseTransitions: TransitionMap = {
  DRAFT: ["APPROVED", "CANCELLED"],
  APPROVED: ["CANCELLED"],
  CANCELLED: [],
};