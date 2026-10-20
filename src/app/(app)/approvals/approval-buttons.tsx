"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelApprovalAction, decideApprovalAction } from "./actions";

export function ApprovalButtons({ id, mode }: { id: string; mode: "decide" | "cancel" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Failed");
      else router.refresh();
    });
  }

  function approve() {
    run(() => decideApprovalAction(id, "APPROVED", ""));
  }

  function reject() {
    const reason = window.prompt("Why is this being rejected?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A reason is required (at least 3 characters)");
      return;
    }
    run(() => decideApprovalAction(id, "REJECTED", reason));
  }

  function cancel() {
    if (!window.confirm("Cancel this request?")) return;
    run(() => cancelApprovalAction(id));
  }

  return (
    <div className="space-y-1">
      {mode === "decide" ? (
        <div className="flex gap-1">
          <Button size="sm" disabled={pending} onClick={approve}>
            Approve
          </Button>
          <Button size="sm" variant="destructive" disabled={pending} onClick={reject}>
            Reject
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" disabled={pending} onClick={cancel}>
          Cancel
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}