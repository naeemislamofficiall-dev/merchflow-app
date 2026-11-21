"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Activity, CalendarDays, Clock, Eye, Filter, Layers, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { runJobAction } from "./actions";

export type JobOption = { key: string; label: string };

export type RunRow = {
  id: string;
  jobKey: string;
  label: string;
  status: string;
  trigger: string;
  startedText: string;
  ts: number;
  duration: number | null;
  result: string;
  isError: boolean;
};

const PAGE_SIZE = 10;
const DAY_MS = 86_400_000;
const RANGES = [
  { value: "all", label: "All time", days: 0 },
  { value: "1", label: "Last 24 hours", days: 1 },
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
];
const DEF = { job: "", status: "", range: "all" };

const HEAD = ["Job", "Status", "Trigger", "Started", "Duration (ms)", "Result / error", "Actions"];

const field =
  "h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-normal text-ink shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";

function StatusPill({ status }: { status: string }) {
  const ok = status === "SUCCESS";
  const bad = status === "FAILED";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
        ok && "bg-emerald-100 text-emerald-700",
        bad && "bg-rose-100 text-rose-700",
        !ok && !bad && "bg-slate-100 text-slate-600"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", ok && "bg-emerald-500", bad && "bg-rose-500", !ok && !bad && "bg-slate-400")} />
      {status}
    </span>
  );
}

function IconField({ icon: Icon, children }: { icon: typeof Layers; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      {children}
    </div>
  );
}

export function JobsHistory({
  rows,
  jobs,
  canRun,
  nowMs,
}: {
  rows: RunRow[];
  jobs: JobOption[];
  canRun: boolean;
  nowMs: number;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(DEF);
  const [applied, setApplied] = useState(DEF);
  const [pageIdx, setPageIdx] = useState(0);
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const statuses = [...new Set(rows.map((r) => r.status))];
  const days = RANGES.find((r) => r.value === applied.range)?.days ?? 0;
  const shown = rows.filter(
    (r) =>
      (!applied.job || r.jobKey === applied.job) &&
      (!applied.status || r.status === applied.status) &&
      (days === 0 || nowMs - r.ts <= days * DAY_MS)
  );

  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const page = Math.min(pageIdx, pages - 1);
  const slice = shown.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    setApplied(draft);
    setPageIdx(0);
  }

  function reset() {
    setDraft(DEF);
    setApplied(DEF);
    setPageIdx(0);
  }

  function runSelected() {
    if (!draft.job) return;
    setNote(null);
    start(async () => {
      const res = await runJobAction(draft.job);
      if (!res.ok) setNote({ ok: false, text: res.error });
      else {
        setNote({ ok: true, text: "Job queued. The list will refresh in a moment." });
        setTimeout(() => router.refresh(), 1500);
      }
    });
  }

  const nav = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold";

  return (
    <div className="space-y-5">
      <form
        onSubmit={apply}
        className="flex flex-wrap items-end gap-4 rounded-card border border-slate-100 bg-white p-5 shadow-card"
      >
        <label className="grid min-w-48 flex-1 gap-1.5 text-sm font-semibold text-navy-800">
          Job
          <IconField icon={Layers}>
            <select value={draft.job} onChange={(e) => setDraft({ ...draft, job: e.target.value })} className={field}>
              <option value="">All Jobs</option>
              {jobs.map((j) => (
                <option key={j.key} value={j.key}>
                  {j.label}
                </option>
              ))}
            </select>
          </IconField>
        </label>
        <label className="grid min-w-44 flex-1 gap-1.5 text-sm font-semibold text-navy-800">
          Status
          <IconField icon={Activity}>
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              className={field}
            >
              <option value="">All Status</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </IconField>
        </label>
        <label className="grid min-w-44 flex-1 gap-1.5 text-sm font-semibold text-navy-800">
          Date Range
          <IconField icon={CalendarDays}>
            <select
              value={draft.range}
              onChange={(e) => setDraft({ ...draft, range: e.target.value })}
              className={field}
            >
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </IconField>
        </label>
        <div className="ml-auto flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
          >
            <Filter className="h-4 w-4" strokeWidth={2.5} /> Filter
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-navy-800 shadow-xs hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          {canRun && (
            <button
              type="button"
              onClick={runSelected}
              disabled={pending || !draft.job}
              title={draft.job ? "Run the selected job now" : "Select a job first"}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Play className="h-4 w-4" /> {pending ? "Queueing..." : "Run Job"}
            </button>
          )}
        </div>
      </form>

      {note && (
        <p className={cn("text-sm", note.ok ? "text-emerald-700" : "text-destructive")}>{note.text}</p>
      )}

      <section className="rounded-card border border-slate-100 bg-white shadow-card">
        <h2 className="flex items-center gap-2.5 px-6 pt-5 font-heading text-xl font-semibold text-navy-800">
          <Clock className="h-5 w-5 text-blue-600" /> Job History
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {HEAD.map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
                      h === "Duration (ms)" ? "text-right" : "text-left"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 align-top transition-colors hover:bg-blue-50/40">
                  <td className="px-4 py-3 font-medium text-navy-800">{r.label}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-3 uppercase">{r.trigger}</td>
                  <td className="whitespace-nowrap px-4 py-3">{r.startedText}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.duration ?? "-"}</td>
                  <td className={cn("max-w-xs truncate px-4 py-3", r.isError && "font-medium text-red-600")}>
                    {r.result}
                  </td>
                  <td className="px-4 py-3">
                    {r.result !== "-" ? (
                      <details>
                        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50">
                          <Eye className="h-4 w-4" /> View
                        </summary>
                        <p
                          className={cn(
                            "mt-2 max-w-xs whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 text-xs",
                            r.isError && "text-red-600"
                          )}
                        >
                          {r.result}
                        </p>
                      </details>
                    ) : null}
                  </td>
                </tr>
              ))}
              {slice.length === 0 && (
                <tr>
                  <td colSpan={HEAD.length} className="px-4 py-10 text-center text-slate-500">
                    No runs match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <span className="text-sm font-medium text-navy-800">
            {shown.length} runs · Page {page + 1} of {pages}
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
    </div>
  );
}