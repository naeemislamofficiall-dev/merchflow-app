"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarDays, Check, Phone, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addContactAction,
  escalateAction,
  markReceivedAction,
  refreshDelaysAction,
  revisePromiseAction,
} from "./actions";

type Res = { ok: true } | { ok: false; error: string };

const OUTLINE =
  "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border bg-card px-3 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-60";
const SOLID =
  "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60";
const INPUT =
  "h-10 w-full rounded-lg border bg-card px-3 text-sm text-navy-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200";

export function RefreshButton() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  function refresh() {
    setMsg("");
    start(async () => {
      const res = await refreshDelaysAction();
      if (!res.ok) setMsg(res.error);
      else {
        setMsg(`Checked ${res.data.checked}, ${res.data.alerts} new delay notice(s)`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
      <button
        type="button"
        onClick={refresh}
        disabled={pending}
        className="inline-flex h-11 items-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold text-blue-600 shadow-card transition-colors hover:bg-blue-50 disabled:opacity-60"
      >
        <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
        {pending ? "Checking..." : "Recalculate delays"}
      </button>
    </div>
  );
}

export function RowActions({ id, latest, escalated }: { id: string; latest: string; escalated: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<Res>, after?: () => void) {
    setError("");
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else {
        after?.();
        router.refresh();
      }
    });
  }

  function revise() {
    const d = window.prompt("New promised date (YYYY-MM-DD)", latest);
    if (d === null) return;
    run(() => revisePromiseAction(id, d.trim(), ""));
  }

  function escalate() {
    const note = window.prompt("Why is this being escalated?");
    if (note === null) return;
    run(() => escalateAction(id, note));
  }

  function received() {
    if (!window.confirm("Mark the goods as received today?")) return;
    run(() => markReceivedAction(id));
  }

  function submitContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    run(
      () =>
        addContactAction({
          followUpId: id,
          method: String(fd.get("method") ?? ""),
          contactPerson: String(fd.get("contactPerson") ?? ""),
          notes: String(fd.get("notes") ?? ""),
        }),
      () => {
        form.reset();
        setShowContact(false);
      }
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={OUTLINE} disabled={pending} onClick={() => setShowContact((s) => !s)}>
          <Phone className="h-4 w-4" /> Log Contact
        </button>
        <button type="button" className={OUTLINE} disabled={pending} onClick={revise}>
          <CalendarDays className="h-4 w-4" /> New Date
        </button>
        {!escalated && (
          <button type="button" className={OUTLINE} disabled={pending} onClick={escalate}>
            <ArrowUpRight className="h-4 w-4" /> Escalate
          </button>
        )}
        <button type="button" className={SOLID} disabled={pending} onClick={received}>
          <Check className="h-4 w-4" strokeWidth={3} /> Received
        </button>
      </div>

      {showContact && (
        <form onSubmit={submitContact} className="grid gap-2 rounded-xl border bg-slate-50 p-3 md:w-80">
          <select name="method" defaultValue="phone" className={INPUT}>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="visit">Visit</option>
          </select>
          <input name="contactPerson" placeholder="Spoke to" maxLength={100} className={INPUT} />
          <input name="notes" placeholder="Notes" maxLength={1000} className={INPUT} />
          <button type="submit" disabled={pending} className={SOLID}>
            Save contact
          </button>
        </form>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}