"use client";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  cancelProductionAction,
  closeProductionAction,
  completeProductionAction,
  pauseProductionAction,
  releaseProductionAction,
  resumeProductionAction,
  startProductionAction,
} from "../actions";

export function ProductionActions({
  productionId,
  status,
  quantity,
}: {
  productionId: string;
  status: string;
  quantity: number;
}) {
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

  function askReason(question: string) {
    const reason = window.prompt(question);
    if (reason === null) return null;
    if (reason.trim().length < 3) {
      setError("A reason is required (at least 3 characters)");
      return null;
    }
    return reason.trim();
  }

  function pause() {
    const reason = askReason("Why is production being paused?");
    if (reason) run(() => pauseProductionAction(productionId, reason));
  }

  function cancel() {
    const reason = askReason("Why is this production order being cancelled?");
    if (reason) run(() => cancelProductionAction(productionId, reason));
  }

  function complete() {
    const input = window.prompt(`How many pieces were completed? (planned ${quantity})`);
    if (input === null) return;
    const done = Number(input);
    if (!Number.isInteger(done) || done < 0) {
      setError("Enter a whole number, 0 or more");
      return;
    }
    let overReason = "";
    if (done > quantity) {
      const r = askReason(`${done} is more than the planned ${quantity}. Why was it over-produced?`);
      if (!r) return;
      overReason = r;
    }
    run(() => completeProductionAction(productionId, done, overReason));
  }

  const buttons: React.ReactNode[] = [];
  const add = (key: string, label: string, onClick: () => void, outline = false) =>
    buttons.push(
      <Button key={key} size="sm" variant={outline ? "outline" : undefined} disabled={pending} onClick={onClick}>
        {label}
      </Button>
    );

  if (status === "PLANNED") {
    add("release", "Release", () => run(() => releaseProductionAction(productionId)));
    add("cancel", "Cancel", cancel, true);
  }
  if (status === "RELEASED") {
    add("start", "Start production", () => run(() => startProductionAction(productionId)));
    add("cancel", "Cancel", cancel, true);
  }
  if (status === "IN_PROGRESS") {
    add("complete", "Complete", complete);
    add("pause", "Pause", pause, true);
  }
  if (status === "PAUSED") {
    add("resume", "Resume", () => run(() => resumeProductionAction(productionId)));
    add("complete", "Complete", complete, true);
  }
    if (status === "RELEASED" || status === "IN_PROGRESS") {
    buttons.push(
      <Link
        key="cut"
        href={`/cutting/new?productionOrderId=${productionId}`}
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        New cut plan
      </Link>
    );
  }
  if (status === "COMPLETED") add("close", "Close", () => run(() => closeProductionAction(productionId)), true);

  if (buttons.length === 0) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">{buttons}</div>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}