"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { approveBomAction, newBomRevisionAction } from "../actions";

export function BomActions({ bomId, status, itemCount }: { bomId: string; status: string; itemCount: number }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function approve() {
    setError("");
    start(async () => {
      const res = await approveBomAction(bomId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function revise() {
    setError("");
    start(async () => {
      const res = await newBomRevisionAction(bomId);
      if (!res.ok) setError(res.error);
      else router.push(`/bom/${res.data.id}`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status === "DRAFT" && (
          <Button size="sm" disabled={pending || itemCount === 0} onClick={approve}>
            Approve BOM
          </Button>
        )}
        {status !== "DRAFT" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={revise}>
            New revision
          </Button>
        )}
      </div>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}