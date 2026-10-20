"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelRfqAction, closeRfqAction, sendRfqAction } from "../actions";

export function RfqActions({ rfqId, status }: { rfqId: string; status: string }) {
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

  function cancel() {
    if (!window.confirm("Cancel this RFQ?")) return;
    run(() => cancelRfqAction(rfqId));
  }

  if (status !== "DRAFT" && status !== "SENT") return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status === "DRAFT" && (
          <Button size="sm" disabled={pending} onClick={() => run(() => sendRfqAction(rfqId))}>
            Send to suppliers
          </Button>
        )}
        {status === "SENT" && (
          <Button size="sm" disabled={pending} onClick={() => run(() => closeRfqAction(rfqId))}>
            Close RFQ
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={pending} onClick={cancel}>
          Cancel
        </Button>
      </div>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}