"use client";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  acknowledgePoAction,
  approvePoAction,
  cancelPoAction,
  closePoAction,
  rejectPoAction,
  revisePoAction,
  sendPoAction,
  submitPoAction,
} from "../actions";

export function PoActions({ poId, status }: { poId: string; status: string }) {
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

  function askReason(question: string) {
    const reason = window.prompt(question);
    if (reason === null) return null;
    if (reason.trim().length < 3) {
      setError("A reason is required (at least 3 characters)");
      return null;
    }
    return reason.trim();
  }

  function reject() {
    const reason = askReason("Why is this PO being rejected?");
    if (reason) run(() => rejectPoAction(poId, reason));
  }

  function cancel() {
    const reason = askReason("Why is this PO being cancelled?");
    if (reason) run(() => cancelPoAction(poId, reason));
  }

  function acknowledge() {
    const d = window.prompt("Supplier's promised delivery date (YYYY-MM-DD). Leave blank to keep the PO date.");
    if (d === null) return;
    const date = d.trim();
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Use the format YYYY-MM-DD");
      return;
    }
    run(() => acknowledgePoAction(poId, date));
  }

  const buttons: React.ReactNode[] = [];
  const add = (key: string, label: string, onClick: () => void, outline = false) =>
    buttons.push(
      <Button key={key} size="sm" variant={outline ? "outline" : undefined} disabled={pending} onClick={onClick}>
        {label}
      </Button>
    );

  if (status === "DRAFT" || status === "REVISION") add("submit", "Submit for approval", () => run(() => submitPoAction(poId)));
  if (status === "DRAFT") add("cancel", "Cancel PO", cancel, true);
  if (status === "SUBMITTED") {
    add("approve", "Approve", () => run(() => approvePoAction(poId)));
    add("reject", "Reject", reject, true);
  }
  if (status === "APPROVED") {
    add("send", "Send to supplier", () => run(() => sendPoAction(poId)));
    add("cancel", "Cancel PO", cancel, true);
  }
  if (status === "SENT") {
    add("ack", "Supplier acknowledged", acknowledge);
    add("cancel", "Cancel PO", cancel, true);
  }
  if (status === "ACKNOWLEDGED") add("cancel", "Cancel PO", cancel, true);
  if (status === "REJECTED") add("revise", "Revise", () => run(() => revisePoAction(poId)), true);
    if (status === "SENT" || status === "ACKNOWLEDGED" || status === "PARTIAL_RECEIPT") {
    buttons.push(
      <Link key="grn" href={`/goods-receipts/new?poId=${poId}`} className={buttonVariants({ size: "sm" })}>
        Receive goods
      </Link>
    );
  }
  if (status === "COMPLETE") add("close", "Close PO", () => run(() => closePoAction(poId)), true);

  if (buttons.length === 0) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">{buttons}</div>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
