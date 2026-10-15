"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelOrderAction, confirmOrderAction } from "../actions";

export function OrderActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean } & Record<string, unknown>>) {
    setError("");
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(String(res.error ?? "Failed"));
      else router.refresh();
    });
  }

  function cancel() {
    const reason = window.prompt("Why is this order being cancelled?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("Cancel reason is required (at least 3 characters)");
      return;
    }
    run(() => cancelOrderAction(orderId, reason.trim()));
  }

  if (status !== "DRAFT" && status !== "CONFIRMED") return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status === "DRAFT" && (
          <Button size="sm" disabled={pending} onClick={() => run(() => confirmOrderAction(orderId))}>
            Confirm order
          </Button>
        )}
        {status === "CONFIRMED" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={cancel}>
            Cancel order
          </Button>
        )}
      </div>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}