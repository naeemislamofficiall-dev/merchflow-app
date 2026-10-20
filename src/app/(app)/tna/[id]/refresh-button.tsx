"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { refreshTnaPlanAction } from "../actions";

export function RefreshButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [pending, start] = useTransition();

  function run() {
    setMessage("");
    start(async () => {
      const res = await refreshTnaPlanAction(planId);
      if (!res.ok) {
        setIsError(true);
        setMessage(res.error);
        return;
      }
      const { delayed, atRisk, shipmentRisk } = res.data;
      setIsError(shipmentRisk);
      setMessage(
        `${delayed} delayed, ${atRisk} at risk.` + (shipmentRisk ? " The ship date is at risk!" : " Ship date is safe.")
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" disabled={pending} onClick={run}>
        {pending ? "Checking..." : "Refresh statuses"}
      </Button>
      {message && (
        <p className={`max-w-xs text-right text-xs ${isError ? "text-destructive" : "text-muted-foreground"}`}>
          {message}
        </p>
      )}
    </div>
  );
}