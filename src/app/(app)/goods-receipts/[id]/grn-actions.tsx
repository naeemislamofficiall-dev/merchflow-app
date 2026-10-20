"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelGrnAction, postGrnAction } from "../actions";

export function GrnActions({ grnId, status }: { grnId: string; status: string }) {
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

  function post() {
    if (!window.confirm("Post this GRN? Stock will increase and this cannot be cancelled.")) return;
    run(() => postGrnAction(grnId));
  }

  function cancel() {
    const reason = window.prompt("Why is this GRN being cancelled?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A reason is required (at least 3 characters)");
      return;
    }
    run(() => cancelGrnAction(grnId, reason.trim()));
  }

  if (status !== "DRAFT") return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={post}>
          Post to stock
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={cancel}>
          Cancel GRN
        </Button>
      </div>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}