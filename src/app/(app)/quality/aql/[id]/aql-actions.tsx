"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { holdAqlAction, overrideAqlAction, recordAqlAction } from "../actions";

export function AqlActions({
  aqlId,
  result,
  recorded,
}: {
  aqlId: string;
  result: string;
  recorded: boolean;
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

  function askCount(label: string) {
    const v = window.prompt(label, "0");
    if (v === null) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) {
      setError("Enter a whole number, 0 or more");
      return null;
    }
    return n;
  }

  function record() {
    const c = askCount("Critical defects found?");
    if (c === null) return;
    const maj = askCount("Major defects found?");
    if (maj === null) return;
    const min = askCount("Minor defects found?");
    if (min === null) return;
    run(() => recordAqlAction(aqlId, c, maj, min));
  }

  function withReason(question: string, min: number, fn: (reason: string) => Promise<{ ok: boolean }>) {
    const reason = window.prompt(question);
    if (reason === null) return;
    if (reason.trim().length < min) {
      setError(`A reason of at least ${min} characters is required`);
      return;
    }
    run(() => fn(reason.trim()));
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {!recorded && (
          <Button size="sm" disabled={pending} onClick={record}>
            Record result
          </Button>
        )}
        {result !== "PASS" && result !== "HOLD" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => withReason("Why is this inspection put on hold?", 3, (r) => holdAqlAction(aqlId, r))}
          >
            Put on hold
          </Button>
        )}
        {result !== "PASS" && recorded && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              withReason("Reason to allow shipment despite this result (at least 5 characters)", 5, (r) =>
                overrideAqlAction(aqlId, r)
              )
            }
          >
            Override
          </Button>
        )}
      </div>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}