"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
      <button
        type="button"
        disabled={pending}
        onClick={remove}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" /> Remove
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}