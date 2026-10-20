"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  approvePrAction,
  changePrStatusAction,
  rejectPrAction,
  submitPrAction,
} from "../actions";

export function PrActions({ prId, status, lineCount }: { prId: string; status: string; lineCount: number }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean }>) {
    setError("");
    start(async () => {
      const res = (await fn()) as { ok: boolean; error?: string };
      if (!res.ok) setError(res.error ?? "Failed");
      else router.refresh();
    });
  }

  function reject() {
    const reason = window.prompt("Why is this PR being rejected?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A rejection reason is required (at least 3 characters)");
      return;
    }
    run(() => rejectPrAction(prId, reason.trim()));
  }

  function cancel() {
    if (!window.confirm("Cancel this PR? This cannot be undone.")) return;
    run(() => changePrStatusAction(prId, "CANCELLED"));
  }

  const buttons: React.ReactNode[] = [];
  if (status === "DRAFT") {
    buttons.push(
      <Button key="submit" size="sm" disabled={pending || lineCount === 0} onClick={() => run(() => submitPrAction(prId))}>
        Submit for approval
      </Button>,
      <Button key="cancel" size="sm" variant="outline" disabled={pending} onClick={cancel}>
        Cancel PR
      </Button>
    );
  }
  if (status === "SUBMITTED") {
    buttons.push(
      <Button key="approve" size="sm" disabled={pending} onClick={() => run(() => approvePrAction(prId))}>
        Approve
      </Button>,
      <Button key="reject" size="sm" variant="outline" disabled={pending} onClick={reject}>
        Reject
      </Button>
    );
  }
  if (status === "APPROVED") {
    buttons.push(
      <Button key="cancel" size="sm" variant="outline" disabled={pending} onClick={cancel}>
        Cancel PR
      </Button>
    );
  }
  if (status === "REJECTED") {
    buttons.push(
      <Button
        key="draft"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => changePrStatusAction(prId, "DRAFT"))}
      >
        Back to draft
      </Button>
    );
  }
  if (status === "PO_CREATED") {
    buttons.push(
      <Button
        key="close"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => changePrStatusAction(prId, "CLOSED"))}
      >
        Close PR
      </Button>
    );
  }

  if (buttons.length === 0) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">{buttons}</div>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}