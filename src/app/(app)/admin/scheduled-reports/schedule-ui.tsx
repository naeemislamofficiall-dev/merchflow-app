"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  Clock,
  FileSpreadsheet,
  FileText,
  List,
  Mail,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MailArt } from "@/components/admin/schedule-art";
import {
  createScheduleAction,
  deleteScheduleAction,
  runScheduleNowAction,
  toggleScheduleAction,
} from "./actions";

const field =
  "h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-normal text-ink shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";

function IconField({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      {children}
    </div>
  );
}

const EMPTY_FORM = { name: "", format: "XLSX", recipients: "", timeOfDay: "08:00", rangeDays: "" };

export function ScheduleForm({ reports }: { reports: { key: string; title: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ ...EMPTY_FORM, reportKey: reports[0]?.key ?? "" });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  function submit() {
    start(async () => {
      setMsg("");
      const res = await createScheduleAction({
        ...f,
        rangeDays: f.rangeDays ? Number(f.rangeDays) : undefined,
      });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setF((p) => ({ ...p, name: "", recipients: "", rangeDays: "" }));
      router.refresh();
    });
  }

  return (
    <section className="relative overflow-hidden rounded-card border border-l-4 border-slate-100 border-l-blue-600 bg-white p-6 shadow-card">
      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </span>
            <div>
              <h2 className="font-heading text-xl font-semibold text-blue-700">Create New Scheduled Report</h2>
              <p className="text-sm text-slate-500">Set up a report schedule to receive regular updates</p>
            </div>
          </div>

          <div className="grid gap-x-5 gap-y-4 md:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
              <span>
                Name <span className="text-destructive">*</span>
              </span>
              <IconField icon={FileText}>
                <input
                  value={f.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Enter report name..."
                  className={field}
                />
              </IconField>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
              Report
              <IconField icon={List}>
                <select value={f.reportKey} onChange={(e) => set("reportKey", e.target.value)} className={field}>
                  {reports.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </IconField>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
              Format
              <IconField icon={FileSpreadsheet}>
                <select value={f.format} onChange={(e) => set("format", e.target.value)} className={field}>
                  <option value="XLSX">Excel</option>
                  <option value="CSV">CSV</option>
                </select>
              </IconField>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
              <span>
                Recipients <span className="font-normal text-slate-500">(comma separated emails)</span>
              </span>
              <IconField icon={Mail}>
                <input
                  value={f.recipients}
                  onChange={(e) => set("recipients", e.target.value)}
                  placeholder="john@example.com, jane@example.com"
                  className={field}
                />
              </IconField>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
              <span>
                Time <span className="font-normal text-slate-500">(24h, company time zone)</span>
              </span>
              <IconField icon={Clock}>
                <input
                  type="time"
                  value={f.timeOfDay}
                  onChange={(e) => set("timeOfDay", e.target.value)}
                  className={field}
                />
              </IconField>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
              <span>
                Last N days <span className="font-normal text-slate-500">(blank = all data)</span>
              </span>
              <IconField icon={CalendarDays}>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={f.rangeDays}
                  onChange={(e) => set("rangeDays", e.target.value)}
                  placeholder="All data"
                  className={field}
                />
              </IconField>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={submit}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-60"
            >
              <CalendarPlus className="h-4 w-4" /> {pending ? "Saving..." : "Create Schedule"}
            </button>
            {msg && <span className="text-sm text-destructive">{msg}</span>}
          </div>
        </div>

        <MailArt className="hidden h-44 w-44 shrink-0 xl:block" />
      </div>
    </section>
  );
}

// ---------- table ----------

export type ScheduleRow = {
  id: string;
  name: string;
  report: string;
  time: string;
  format: string;
  recipients: string;
  isActive: boolean;
  lastRun: string;
  lastStatus: string | null;
};

type ActionFn = (id: string) => Promise<{ ok: boolean; error?: string }>;

function useRowAction(id: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const go = (fn: ActionFn, ok = "") =>
    start(async () => {
      setMsg("");
      const res = await fn(id);
      if (!res.ok) setMsg(res.error ?? "Failed");
      else {
        if (ok) setMsg(ok);
        router.refresh();
      }
    });
  return { pending, msg, go };
}

function ActiveToggle({ id, active, disabled }: { id: string; active: boolean; disabled: boolean }) {
  const { pending, msg, go } = useRowAction(id);
  return (
    <div className="space-y-1">
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={active ? "Pause this schedule" : "Resume this schedule"}
        disabled={disabled || pending}
        onClick={() => go(toggleScheduleAction)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          active ? "bg-blue-600" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
            active ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
      {msg && <p className="max-w-40 text-xs text-red-600">{msg}</p>}
    </div>
  );
}

function RowActions({ id }: { id: string }) {
  const { pending, msg, go } = useRowAction(id);
  const btn =
    "inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold shadow-xs transition-colors disabled:opacity-50";
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => go(runScheduleNowAction, "Sent")}
          className={cn(btn, "text-blue-600 hover:border-blue-300 hover:bg-blue-50")}
        >
          <Send className="h-4 w-4" /> Run now
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Delete this schedule?")) go(deleteScheduleAction);
          }}
          className={cn(btn, "text-rose-600 hover:border-rose-300 hover:bg-rose-50")}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
      {msg && <p className="max-w-52 text-xs text-slate-500">{msg}</p>}
    </div>
  );
}

function FormatBadge({ format }: { format: string }) {
  const xlsx = format === "XLSX";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold",
        xlsx ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
      )}
    >
      <FileSpreadsheet className="h-3.5 w-3.5" /> {xlsx ? "Excel" : "CSV"}
    </span>
  );
}

function LastStatus({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-400">-</span>;
  const failed = value.startsWith("FAILED");
  const sent = value === "SENT";
  return (
    <span
      title={value}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
        failed ? "bg-rose-100 text-rose-700" : sent ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", failed ? "bg-rose-500" : sent ? "bg-emerald-500" : "bg-slate-400")} />
      {failed ? "Failed" : sent ? "Sent" : value}
    </span>
  );
}

const HEAD = ["Name", "Report", "Time", "Format", "Recipients", "Active", "Last run", "Last status", "Actions"];
const PAGE_SIZE = 10;

export function SchedulesTable({ rows, canManage }: { rows: ScheduleRow[]; canManage: boolean }) {
  const [pageIdx, setPageIdx] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(pageIdx, pages - 1);
  const slice = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const nav = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold";

  return (
    <section className="rounded-card border border-slate-100 bg-white shadow-card">
      <h2 className="flex items-center gap-2.5 px-6 pt-5 font-heading text-xl font-semibold text-navy-800">
        <CalendarClock className="h-5 w-5 text-blue-600" /> Scheduled Reports
      </h2>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80">
            <tr>
              {HEAD.map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 align-top transition-colors hover:bg-blue-50/40">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="font-semibold text-navy-800">{s.name}</span>
                  </span>
                </td>
                <td className="px-4 py-3">{s.report}</td>
                <td className="px-4 py-3 tabular-nums">{s.time}</td>
                <td className="px-4 py-3">
                  <FormatBadge format={s.format} />
                </td>
                <td className="max-w-xs truncate px-4 py-3">{s.recipients}</td>
                <td className="px-4 py-3">
                  <ActiveToggle id={s.id} active={s.isActive} disabled={!canManage} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">{s.lastRun}</td>
                <td className="px-4 py-3">
                  <LastStatus value={s.lastStatus} />
                </td>
                <td className="px-4 py-3">{canManage && <RowActions id={s.id} />}</td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan={HEAD.length} className="px-4 py-10 text-center text-slate-500">
                  No scheduled reports
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <span className="text-sm font-medium text-navy-800">
          {rows.length} schedules · Page {page + 1} of {pages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPageIdx(page - 1)}
            className={cn(nav, "border border-slate-200 text-navy-800 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400")}
          >
            Previous
          </button>
          <span className={cn(nav, "bg-blue-600 text-white")}>{page + 1}</span>
          <button
            type="button"
            disabled={page >= pages - 1}
            onClick={() => setPageIdx(page + 1)}
            className={cn(nav, "border border-slate-200 text-navy-800 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400")}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}