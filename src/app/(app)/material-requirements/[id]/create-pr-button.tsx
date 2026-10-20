"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createPrFromMrpAction } from "../actions";

export function CreatePrButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function create() {
    setError("");
    start(async () => {
      const res = await createPrFromMrpAction(runId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" disabled={pending} onClick={create}>
        {pending ? "Creating..." : "Create purchase requisition"}
      </Button>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}