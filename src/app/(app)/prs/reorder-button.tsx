"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createPrFromReorderAction } from "./actions";

export function ReorderButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function create() {
    setError("");
    start(async () => {
      const res = await createPrFromReorderAction();
      if (!res.ok) setError(res.error);
      else router.push(`/prs/${res.data.id}`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" disabled={pending} onClick={create}>
        {pending ? "Creating..." : "PR from reorder points"}
      </Button>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}