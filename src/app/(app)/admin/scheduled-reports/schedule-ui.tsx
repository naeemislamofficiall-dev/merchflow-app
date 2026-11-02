"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createScheduleAction,
  deleteScheduleAction,
  runScheduleNowAction,
  toggleScheduleAction,
} from "./actions";

const sel = "h-9 w-full rounded-md border bg-background px-2 text-sm";

export function ScheduleForm({ reports }: { reports: { key: string; title: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({
    name: "", reportKey: reports[0]?.key ?? "", format: "XLSX", recipients: "", timeOfDay: "08:00", rangeDays: "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-2 rounded-md border p-3">
      <h2 className="text-sm font-semibold">New scheduled report</h2>
      <div className="grid gap-2 md:grid-cols-3">
        <label className="text-xs text-muted-foreground">Name
          <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Factory Production Summary" className="mt-1" />
        </label>
        <label className="text-xs text-muted-foreground">Report
          <select className={`${sel} mt-1`} value={f.reportKey} onChange={(e) => set("reportKey", e.target.value)}>
            {reports.map((r) => <option key={r.key} value={r.key}>{r.title}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Format
          <select className={`${sel} mt-1`} value={f.format} onChange={(e) => set("format", e.target.value)}>
            <option value="XLSX">Excel</option>
            <option value="CSV">CSV</option>
          </select>
        </label>
        <label className="text-xs text-muted-foreground md:col-span-2">Recipients (comma separated emails)
          <Input value={f.recipients} onChange={(e) => set("recipients", e.target.value)} className="mt-1" />
        </label>
        <label className="text-xs text-muted-foreground">Time (24h, company time zone)
          <Input type="time" value={f.timeOfDay} onChange={(e) => set("timeOfDay", e.target.value)} className="mt-1" />
        </label>
        <label className="text-xs text-muted-foreground">Last N days (blank = all data)
          <Input type="number" min={1} max={365} value={f.rangeDays} onChange={(e) => set("rangeDays", e.target.value)} className="mt-1" />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setMsg("");
              const res = await createScheduleAction({
                ...f,
                rangeDays: f.rangeDays ? Number(f.rangeDays) : undefined,
              });
              if (!res.ok) setMsg(res.error);
              else router.refresh();
            })
          }
        >
          {pending ? "Saving..." : "Create schedule"}
        </Button>
        {msg && <span className="text-xs text-red-600">{msg}</span>}
      </div>
    </div>
  );
}

export function RowActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const go = (fn: (id: string) => Promise<{ ok: boolean; error?: string }>, ok = "") =>
    start(async () => {
      setMsg("");
      const res = await fn(id);
      if (!res.ok) setMsg(res.error ?? "Failed");
      else {
        if (ok) setMsg(ok);
        router.refresh();
      }
    });
  const btn = "rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50";
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <button type="button" disabled={pending} className={btn} onClick={() => go(runScheduleNowAction, "Sent")}>Run now</button>
        <button type="button" disabled={pending} className={btn} onClick={() => go(toggleScheduleAction)}>{active ? "Pause" : "Resume"}</button>
        <button type="button" disabled={pending} className={btn} onClick={() => go(deleteScheduleAction)}>Delete</button>
      </div>
      {msg && <span className="max-w-xs text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}