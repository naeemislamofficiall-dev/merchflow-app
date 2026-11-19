import { createElement } from "react";
import {
  BadgeCheck, Bell, CalendarClock, FileText, Gauge, PackageOpen, Ship, ShieldAlert, Truck,
  type LucideIcon,
} from "lucide-react";

type Meta = { label: string; icon: LucideIcon; box: string };

const RED = "bg-rose-100 text-rose-600";
const ORANGE = "bg-orange-100 text-orange-600";
const BLUE = "bg-blue-100 text-blue-600";
const AMBER = "bg-amber-100 text-amber-600";

export const TYPE_META: Record<string, Meta> = {
  GENERAL: { label: "General", icon: Bell, box: BLUE },
  APPROVAL_PENDING: { label: "Approval pending", icon: BadgeCheck, box: BLUE },
  TNA_OVERDUE: { label: "T&A overdue", icon: CalendarClock, box: ORANGE },
  SUPPLIER_LATE: { label: "Supplier late", icon: Truck, box: ORANGE },
  MATERIAL_SHORTAGE: { label: "Material shortage", icon: PackageOpen, box: RED },
  PRODUCTION_BELOW_TARGET: { label: "Production below target", icon: Gauge, box: ORANGE },
  QC_FAILURE: { label: "QC failure", icon: ShieldAlert, box: RED },
  CERTIFICATE_EXPIRY: { label: "Certificate expiry", icon: FileText, box: AMBER },
  SHIPMENT_RISK: { label: "Shipment risk", icon: Ship, box: RED },
};

const FALLBACK: Meta = { label: "Notification", icon: Bell, box: BLUE };

export const typeLabel = (type?: string) =>
  TYPE_META[type ?? ""]?.label ??
  (type ? type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : FALLBACK.label);

export const typeBox = (type?: string) => (TYPE_META[type ?? ""] ?? FALLBACK).box;

// notification-er dhoron onujayi icon
export function TypeIcon({ type, className }: { type?: string; className?: string }) {
  return createElement((TYPE_META[type ?? ""] ?? FALLBACK).icon, { className });
}

export function timeAgo(ms: number, nowMs: number) {
  const mins = Math.floor((nowMs - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 day ago" : `${d} days ago`;
}