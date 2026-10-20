"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { EnquiryStatus } from "@/generated/prisma/enums";
import { changeEnquiryStatusAction } from "../actions";

const LABEL: Record<string, string> = {
  COSTING: "Send to costing",
  NEGOTIATION: "Start negotiation",
  QUOTED: "Mark as quoted",
  APPROVED: "Approve enquiry",
  CANCELLED: "Cancel enquiry",
};

export function EnquiryActions({
  enquiryId,
  status,
  next,
}: {
  enquiryId: string;
  status: string;
  next: EnquiryStatus[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function go(to: EnquiryStatus) {
    if (to === "CANCELLED" && !window.confirm("Cancel this enquiry? It cannot be reopened.")) return;
    setError("");
    start(async () => {
      const res = await changeEnquiryStatusAction(enquiryId, to);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  if (next.length === 0) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {next.map((to) => (
          <Button
            key={to}
            size="sm"
            variant={to === "CANCELLED" ? "outline" : "default"}
            disabled={pending}
            onClick={() => go(to)}
          >
            {status === "QUOTED" && to === "NEGOTIATION" ? "Reopen negotiation" : (LABEL[to] ?? to)}
          </Button>
        ))}
      </div>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}