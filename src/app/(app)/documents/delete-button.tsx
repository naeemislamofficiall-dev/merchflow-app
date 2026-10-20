"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteDocumentAction } from "./actions";

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function remove() {
    if (!window.confirm("Remove this document?")) return;
    setError("");
    start(async () => {
      const res = await deleteDocumentAction(id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <Button size="sm" variant="outline" disabled={pending} onClick={remove}>
        Remove
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}