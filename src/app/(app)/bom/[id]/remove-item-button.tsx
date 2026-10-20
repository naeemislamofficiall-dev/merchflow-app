"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { removeBomItemAction } from "../actions";

export function RemoveItemButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function remove() {
    if (!window.confirm("Remove this item from the BOM?")) return;
    setError("");
    start(async () => {
      const res = await removeBomItemAction(itemId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" disabled={pending} onClick={remove}>
        Remove
      </Button>
           {error && <p className="max-w-40 text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}