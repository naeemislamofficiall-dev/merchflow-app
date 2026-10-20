"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SampleStatus } from "@/generated/prisma/enums";
import { changeSampleStatusAction, decideSampleAction } from "../actions";

const LABEL: Record<string, string> = {
  IN_DEVELOPMENT: "Start development",
  INTERNAL_QC: "Move to internal QC",
  SENT: "Mark as sent",
  BUYER_REVIEW: "Buyer received, in review",
  REVISION: "Start revision",
  CANCELLED: "Cancel sample",
};

export function SampleActions({
  sampleId,
  status,
  next,
}: {
  sampleId: string;
  status: string;
  next: SampleStatus[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [courier, setCourier] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean } & Record<string, unknown>>) {
    setError("");
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(String(res.error ?? "Failed"));
      else router.refresh();
    });
  }

  function move(to: SampleStatus) {
    if (to === "CANCELLED" && !window.confirm("Cancel this sample request?")) return;
    run(() =>
      changeSampleStatusAction(sampleId, to, {
        courier: courier.trim() || undefined,
        trackingNo: trackingNo.trim() || undefined,
      })
    );
  }

  function approve() {
    if (!window.confirm("Record the buyer's APPROVAL for this sample?")) return;
    run(() => decideSampleAction(sampleId, "APPROVED"));
  }

  function reject() {
    const reason = window.prompt("Why did the buyer reject this sample?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A rejection reason is required (at least 3 characters)");
      return;
    }
    run(() => decideSampleAction(sampleId, "REJECTED", reason.trim()));
  }

  // APPROVED/REJECTED বায়ারের সিদ্ধান্ত, তাই সাধারণ বাটনে আসে না
  const buttons = next.filter((s) => s !== "APPROVED" && s !== "REJECTED");
  const canDecide = status === "BUYER_REVIEW";
  const canSend = buttons.includes("SENT");
  if (buttons.length === 0 && !canDecide) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      {canSend && (
        <div className="flex gap-2">
          <Input
            className="h-8 w-36"
            placeholder="Courier"
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
          />
          <Input
            className="h-8 w-40"
            placeholder="Tracking no"
            value={trackingNo}
            onChange={(e) => setTrackingNo(e.target.value)}
          />
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {buttons.map((to) => (
          <Button
            key={to}
            size="sm"
            variant={to === "CANCELLED" ? "outline" : "default"}
            disabled={pending}
            onClick={() => move(to)}
          >
            {status === "INTERNAL_QC" && to === "IN_DEVELOPMENT" ? "Send back to development" : (LABEL[to] ?? to)}
          </Button>
        ))}
        {canDecide && (
          <>
            <Button size="sm" disabled={pending} onClick={approve}>
              Buyer approved
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={reject}>
              Buyer rejected
            </Button>
          </>
        )}
      </div>
      {error && <p className="max-w-sm text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}