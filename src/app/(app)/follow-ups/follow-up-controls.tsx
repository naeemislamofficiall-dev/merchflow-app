"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  addContactAction,
  escalateAction,
  markReceivedAction,
  refreshDelaysAction,
  revisePromiseAction,
} from "./actions";

type Res = { ok: true } | { ok: false; error: string };

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
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      <Button variant="outline" onClick={refresh} disabled={pending}>
        {pending ? "Checking..." : "Recalculate delays"}
      </Button>
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
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setShowContact((s) => !s)}>
          Log contact
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={revise}>
          New date
        </Button>
        {!escalated && (
          <Button size="sm" variant="outline" disabled={pending} onClick={escalate}>
            Escalate
          </Button>
        )}
        <Button size="sm" disabled={pending} onClick={received}>
          Received
        </Button>
      </div>

      {showContact && (
        <form onSubmit={submitContact} className="grid gap-2 rounded-md border bg-muted p-2 md:w-72">
          <Select name="method" defaultValue="phone">
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="visit">Visit</option>
          </Select>
          <Input name="contactPerson" placeholder="Spoke to" maxLength={100} />
          <Input name="notes" placeholder="Notes" maxLength={1000} />
          <Button size="sm" disabled={pending}>
            Save contact
          </Button>
        </form>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}