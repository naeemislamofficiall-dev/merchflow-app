"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runJobAction } from "./actions";

export function RunNowButton({ jobKey }: { jobKey: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
        onClick={() =>
          start(async () => {
            setError("");
            const res = await runJobAction(jobKey);
            if (!res.ok) setError(res.error);
            else setTimeout(() => router.refresh(), 1500);
          })
        }
      >
        {pending ? "Queueing..." : "Run now"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}