"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  cancelPackingListAction,
  issuePackingListAction,
  refreshPackingListAction,
} from "../actions";

export function PackingListActions({ id, status, canEdit }: { id: string; status: string; canEdit: boolean }) {
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

  function issue() {
    if (!window.confirm("Issue this packing list? It will be frozen and cannot be changed.")) return;
    run(() => issuePackingListAction(id));
  }

  function cancel() {
    const reason = window.prompt("Why is this packing list being cancelled?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A reason is required (at least 3 characters)");
      return;
    }
    run(() => cancelPackingListAction(id, reason.trim()));
  }

  return (
    <div className="space-y-2 print:hidden">
      <div className="flex flex-wrap gap-2">
        {status !== "CANCELLED" && (
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
        )}
        {canEdit && status === "DRAFT" && (
          <>
            <Button variant="outline" disabled={pending} onClick={() => run(() => refreshPackingListAction(id))}>
              Refresh from shipment
            </Button>
            <Button variant="gold" disabled={pending} onClick={issue}>
              Issue
            </Button>
          </>
        )}
        {canEdit && (status === "DRAFT" || status === "ISSUED") && (
          <Button variant="outline" disabled={pending} onClick={cancel}>
            Cancel
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
