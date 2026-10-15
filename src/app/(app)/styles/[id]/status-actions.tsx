"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { StyleStatus } from "@/generated/prisma/enums";
import { changeStyleStatusAction } from "../actions";

const LABEL: Record<string, string> = {
  DEVELOPMENT: "Move to development",
  APPROVED: "Approve style",
  ARCHIVED: "Archive",
};

export function StatusActions({ styleId, next }: { styleId: string; next: StyleStatus[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function go(to: StyleStatus) {
    if (to === "ARCHIVED" && !window.confirm("Archive this style? It cannot be changed afterwards.")) return;
    setError("");
    start(async () => {
      const res = await changeStyleStatusAction(styleId, to);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  if (next.length === 0) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {next.map((to) => (
          <Button
            key={to}
            size="sm"
            variant={to === "ARCHIVED" ? "outline" : "default"}
            disabled={pending}
            onClick={() => go(to)}
          >
            {LABEL[to] ?? to}
          </Button>
        ))}
      </div>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}