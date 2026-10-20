"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateTnaTaskAction } from "../actions";

type Patch = Parameters<typeof updateTnaTaskAction>[1];

export function TaskActions({
  taskId,
  status,
  dueDate,
}: {
  taskId: string;
  status: string;
  dueDate: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run(patch: Patch) {
    setError("");
    start(async () => {
      const res = await updateTnaTaskAction(taskId, patch);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function waive() {
    if (!window.confirm("Waive this milestone? It will be marked as not needed.")) return;
    run({ status: "WAIVED" });
  }

  function revise() {
    const date = window.prompt("New date (YYYY-MM-DD):", dueDate);
    if (date === null) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setError("Use the format YYYY-MM-DD");
      return;
    }
    const reason = window.prompt("Why is the date changing?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A reason is required (at least 3 characters)");
      return;
    }
    run({ revisedDate: date.trim(), delayReason: reason.trim() });
  }

  if (status === "COMPLETED" || status === "WAIVED") return null;
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-1">
        {status === "NOT_STARTED" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run({ status: "ON_TRACK" })}>
            Start
          </Button>
        )}
        <Button size="sm" disabled={pending} onClick={() => run({ status: "COMPLETED" })}>
          Complete
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={revise}>
          Revise date
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={waive}>
          Waive
        </Button>
      </div>
      {error && <p className="max-w-xs text-xs text-destructive">{error}</p>}
    </div>
  );
}