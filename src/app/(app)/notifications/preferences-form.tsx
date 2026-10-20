"use client";

import { useState, useTransition } from "react";
import { setNotificationPreferenceAction } from "@/app/(app)/actions";

type Row = { type: string; inApp: boolean; email: boolean };

const label = (t: string) => t.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

// প্রতিটি টিক দিলেই সাথে সাথে সেভ হয়; ব্যর্থ হলে আগের অবস্থায় ফেরে
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
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-2 text-sm">
        <span />
        <span className="text-xs font-medium uppercase text-muted-foreground">In-app</span>
        <span className="text-xs font-medium uppercase text-muted-foreground">Email</span>
        {state.map((r) => (
          <div key={r.type} className="contents">
            <span>{label(r.type)}</span>
            <input
              type="checkbox"
              checked={r.inApp}
              disabled={pending}
              onChange={() => toggle(r.type, "inApp")}
              aria-label={`${label(r.type)} in-app`}
            />
            <input
              type="checkbox"
              checked={r.email}
              disabled={pending}
              onChange={() => toggle(r.type, "email")}
              aria-label={`${label(r.type)} email`}
            />
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">Email messages are queued now and will be sent once email delivery is connected.</p>
    </div>
  );
}