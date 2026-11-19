"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/approvals/switch";
import { setWorkflowActiveAction } from "./extra-actions";

export function RuleToggle({ id, active, name }: { id: string; active: boolean; name: string }) {
  const router = useRouter();
  const [on, setOn] = useState(active);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  function change(next: boolean) {
    setOn(next);
    setErr("");
    start(async () => {
      const res = await setWorkflowActiveAction(id, next);
      if (!res.ok) {
        setOn(!next);
        setErr(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Switch checked={on} onChange={change} disabled={pending} label={`${name} active`} />
      {err && <span className="text-xs text-destructive">{err}</span>}
    </div>
  );
}