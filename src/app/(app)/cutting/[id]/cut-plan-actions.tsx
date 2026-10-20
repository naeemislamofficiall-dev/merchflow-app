"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelCutPlanAction, reserveFabricAction } from "../actions";

export function CutPlanActions({ planId, status }: { planId: string; status: string }) {
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
    const reason = window.prompt("Why is this cut plan being cancelled?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A reason is required (at least 3 characters)");
      return;
    }
    run(() => cancelCutPlanAction(planId, reason.trim()));
  }

  if (status !== "PLANNED" && status !== "FABRIC_RESERVED") return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status === "PLANNED" && (
          <Button size="sm" disabled={pending} onClick={() => run(() => reserveFabricAction(planId))}>
            Reserve fabric
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={pending} onClick={cancel}>
          Cancel plan
        </Button>
      </div>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}