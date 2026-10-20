import { Badge, type BadgeProps } from "@/components/ui/badge";

type Variant = NonNullable<BadgeProps["variant"]>;

const MAP: Record<string, Variant> = {
  // সবুজ
  ACTIVE: "success", APPROVED: "success", COMPLETE: "success", COMPLETED: "success",
  POSTED: "success", ACCEPTED: "success", FULLY_SHIPPED: "success", PO_CREATED: "success",
  // হলুদ
  SUBMITTED: "warning", PENDING: "warning", AT_RISK: "warning", CONDITIONAL: "warning",
  PARTIAL_RECEIPT: "warning", IN_PRODUCTION: "warning", PARTIALLY_SHIPPED: "warning",
  REVISION: "warning", BUYER_REVIEW: "warning",
  // লাল
  REJECTED: "danger", CANCELLED: "danger", DELAYED: "danger",
  // ধূসর
  DRAFT: "muted", INACTIVE: "muted", CLOSED: "muted", ARCHIVED: "muted",
  NOT_STARTED: "muted", WAIVED: "muted",
  // নীল
  CONFIRMED: "info", SENT: "info", ACKNOWLEDGED: "info", RECEIVED: "info", ON_TRACK: "info",
  IN_DEVELOPMENT: "info", DEVELOPMENT: "info", REQUESTED: "info", RECOMMENDED: "info",
    // Enquiry
  COSTING: "info", NEGOTIATION: "warning", QUOTED: "info", CONVERTED: "success",
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ").toLowerCase();
  return (
    <Badge variant={MAP[status] ?? "outline"} className="capitalize">
      {label}
    </Badge>
  );
}