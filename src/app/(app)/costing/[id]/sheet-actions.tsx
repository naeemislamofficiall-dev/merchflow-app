"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  approveCostSheetAction,
  newCostVersionAction,
  rejectCostSheetAction,
  reopenCostSheetAction,
  submitCostSheetAction,
} from "../actions";

export function SheetActions({ sheetId, status }: { sheetId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function simple(fn: () => Promise<{ ok: boolean }>) {
    setError("");
    start(async () => {
      const res = (await fn()) as { ok: boolean; error?: string };
      if (!res.ok) setError(res.error ?? "Failed");
      else router.refresh();
    });
  }

  function reject() {
    const reason = window.prompt("Why is this costing being rejected?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A rejection reason is required (at least 3 characters)");
      return;
    }
    simple(() => rejectCostSheetAction(sheetId, reason.trim()));
  }

  function newVersion() {
    setError("");
    start(async () => {
      const res = await newCostVersionAction(sheetId);
      if (!res.ok) setError(res.error);
      else router.push(`/costing/${res.data.id}`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status === "DRAFT" && (
          <Button size="sm" disabled={pending} onClick={() => simple(() => submitCostSheetAction(sheetId))}>
            Submit for approval
          </Button>
        )}
        {status === "SUBMITTED" && (
          <>
            <Button size="sm" disabled={pending} onClick={() => simple(() => approveCostSheetAction(sheetId))}>
              Approve
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={reject}>
              Reject
            </Button>
          </>
        )}
        {status === "REJECTED" && (
          <Button size="sm" disabled={pending} onClick={() => simple(() => reopenCostSheetAction(sheetId))}>
            Reopen as draft
          </Button>
        )}
        {status === "APPROVED" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={newVersion}>
            Create new version
          </Button>
        )}
      </div>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}