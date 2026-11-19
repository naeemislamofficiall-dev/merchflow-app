"use client";

import { useState, useTransition } from "react";
import { Info } from "lucide-react";
import { setNotificationPreferenceAction } from "@/app/(app)/actions";
import { Switch } from "@/components/approvals/switch";
import { TypeIcon, typeBox, typeLabel } from "@/components/notifications/meta";
import { cn } from "@/lib/utils";

type Row = { type: string; inApp: boolean; email: boolean };

// prottek toggle-e sathe sathe save hoy; byartho hole ager obosthay phere
export function PreferencesForm({ rows }: { rows: Row[] }) {
  const [state, setState] = useState(rows);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function toggle(type: string, field: "inApp" | "email") {
    const prev = state;
    const cur = state.find((r) => r.type === type)!;
    const next = { ...cur, [field]: !cur[field] };
    setState(state.map((r) => (r.type === type ? next : r)));
    setError("");
    start(async () => {
      const res = await setNotificationPreferenceAction(type, next.inApp, next.email);
      if (!res.ok) {
        setState(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div>
      <div className="grid grid-cols-[1fr_4rem_4rem] items-center gap-x-2 border-b pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <span />
        <span className="text-center">In-app</span>
        <span className="text-center">Email</span>
      </div>

      <ul className="divide-y divide-slate-100">
        {state.map((r) => (
          <li key={r.type} className="grid grid-cols-[1fr_4rem_4rem] items-center gap-x-2 py-2.5">
            <span className="flex min-w-0 items-center gap-2.5 text-sm text-navy-800">
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", typeBox(r.type))}>
                <TypeIcon type={r.type} className="h-4 w-4" />
              </span>
              <span className="truncate">{typeLabel(r.type)}</span>
            </span>
            <span className="flex justify-center">
              <Switch
                checked={r.inApp}
                disabled={pending}
                onChange={() => toggle(r.type, "inApp")}
                label={`${typeLabel(r.type)} in-app`}
              />
            </span>
            <span className="flex justify-center">
              <Switch
                checked={r.email}
                disabled={pending}
                onChange={() => toggle(r.type, "email")}
                label={`${typeLabel(r.type)} email`}
              />
            </span>
          </li>
        ))}
      </ul>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <p className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50/70 px-3 py-2 text-xs text-slate-600">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
        Email messages are queued now and will be sent once email delivery is connected.
      </p>
    </div>
  );
}