"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteDocAction, setDocStatusAction } from "./actions";

type Step = { to: string; label: string; primary?: boolean };

const FLOW: Record<string, Step[]> = {
  DRAFT: [{ to: "READY", label: "Mark ready", primary: true }],
  READY: [
    { to: "SUBMITTED", label: "Submit", primary: true },
    { to: "DRAFT", label: "Back to draft" },
  ],
  SUBMITTED: [
    { to: "HANDED_OVER", label: "Hand over", primary: true },
    { to: "READY", label: "Back to ready" },
  ],
  HANDED_OVER: [],
};

export function DocActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function move(step: Step) {
    let who = "";
    let date = "";
    if (step.to === "HANDED_OVER") {
      const w = window.prompt("Handed over to (forwarder, C&F agent, bank...)");
      if (w === null) return;
      who = w.trim();
      date = new Date().toISOString().slice(0, 10);
    }
    setError("");
    start(async () => {
      const res = await setDocStatusAction(id, step.to, who, date);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Delete this draft?")) return;
    setError("");
    start(async () => {
      const res = await deleteDocAction(id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  const steps = FLOW[status] ?? [];

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {steps.map((s) => (
          <Button key={s.to} size="sm" variant={s.primary ? "default" : "outline"} disabled={pending} onClick={() => move(s)}>
            {s.label}
          </Button>
        ))}
        {status === "DRAFT" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={remove}>
            Delete
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}