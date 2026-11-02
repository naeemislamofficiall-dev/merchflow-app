"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  addHolidayAction,
  allocatePpcAction,
  cancelPpcAction,
  movePpcAction,
  releasePpcAction,
  removeHolidayAction,
} from "./actions";

const input = "h-9 rounded-md border bg-background px-2 text-sm";
const btn = buttonVariants({ variant: "outline", size: "sm" });

type Outcome = { ok: boolean; message: string; warnings: string[] };

// runAction-er result shape jai hok, ekhane shob handle
function readResult(res: unknown): Outcome {
  const r = (res ?? {}) as {
    ok?: boolean;
    error?: string;
    message?: string;
    data?: { warnings?: string[] };
    warnings?: string[];
  };
  const failed = r.ok === false || Boolean(r.error);
  return {
    ok: !failed,
    message: r.error ?? r.message ?? "",
    warnings: r.data?.warnings ?? r.warnings ?? [],
  };
}

function Feedback({ out }: { out: Outcome | null }) {
  if (!out) return null;
  return (
    <div className="space-y-1 text-sm">
      {!out.ok && <p className="text-red-600">{out.message || "Something went wrong"}</p>}
      {out.ok && <p className="text-green-700">Saved.</p>}
      {out.warnings.map((w) => (
        <p key={w} className="text-amber-700">
          Warning: {w}
        </p>
      ))}
    </div>
  );
}

type Opt = { id: string; label: string };

// ---------- Notun allocation ----------
export function AllocateForm({
  orders,
  lines,
  defaultDate,
}: {
  orders: Opt[];
  lines: Opt[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [out, setOut] = useState<Outcome | null>(null);
  const [v, setV] = useState({ productionOrderId: "", lineId: "", date: defaultDate, plannedQty: "", remarks: "" });
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const o = readResult(await allocatePpcAction(v));
      setOut(o);
      if (o.ok) {
        setV({ ...v, plannedQty: "", remarks: "" });
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">Production order</span>
          <select required className={input} value={v.productionOrderId} onChange={set("productionOrderId")}>
            <option value="">Select…</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">Line</span>
          <select required className={input} value={v.lineId} onChange={set("lineId")}>
            <option value="">Select…</option>
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">Date</span>
          <input required type="date" className={input} value={v.date} onChange={set("date")} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">Qty (pcs)</span>
          <input
            required
            type="number"
            min={1}
            className={`${input} w-28`}
            value={v.plannedQty}
            onChange={set("plannedQty")}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">Remarks</span>
          <input className={`${input} w-48`} value={v.remarks} onChange={set("remarks")} />
        </label>
        <button type="submit" disabled={pending} className={buttonVariants()}>
          {pending ? "Saving…" : "Add allocation"}
        </button>
      </div>
      <Feedback out={out} />
    </form>
  );
}

// ---------- Allocation list (edit/move, release, cancel) ----------
export type AllocationItem = {
  id: string;
  productionNo: string;
  styleNo: string;
  lineId: string;
  lineCode: string;
  dateKey: string;
  plannedQty: number;
  status: string;
};

function AllocationRow({ a, lines }: { a: AllocationItem; lines: Opt[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [out, setOut] = useState<Outcome | null>(null);
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState({ lineId: a.lineId, date: a.dateKey, plannedQty: String(a.plannedQty) });

  function run(fn: () => Promise<unknown>, after?: () => void) {
    start(async () => {
      const o = readResult(await fn());
      setOut(o);
      if (o.ok) {
        after?.();
        router.refresh();
      }
    });
  }

  function cancel() {
    const reason = window.prompt("Reason for cancelling this allocation?");
    if (!reason) return;
    run(() => cancelPpcAction(a.id, reason));
  }

  return (
    <>
      <tr className="border-t">
        <td className="px-3 py-2">{a.productionNo}</td>
        <td className="px-3 py-2">{a.styleNo}</td>
        {editing ? (
          <>
            <td className="px-3 py-2">
              <select className={input} value={v.lineId} onChange={(e) => setV({ ...v, lineId: e.target.value })}>
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-3 py-2">
              <input type="date" className={input} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                min={1}
                className={`${input} w-24`}
                value={v.plannedQty}
                onChange={(e) => setV({ ...v, plannedQty: e.target.value })}
              />
            </td>
          </>
        ) : (
          <>
            <td className="px-3 py-2">{a.lineCode}</td>
            <td className="px-3 py-2">{a.dateKey}</td>
            <td className="px-3 py-2">{a.plannedQty}</td>
          </>
        )}
        <td className="px-3 py-2 capitalize">{a.status.toLowerCase()}</td>
        <td className="px-3 py-2">
          <div className="flex flex-wrap gap-2">
            {a.status === "PLANNED" && !editing && (
              <button className={btn} disabled={pending} onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
            {editing && (
              <>
                <button
                  className={btn}
                  disabled={pending}
                  onClick={() => run(() => movePpcAction(a.id, v), () => setEditing(false))}
                >
                  Save
                </button>
                <button className={btn} disabled={pending} onClick={() => setEditing(false)}>
                  Close
                </button>
              </>
            )}
            {a.status === "PLANNED" && !editing && (
              <button className={btn} disabled={pending} onClick={() => run(() => releasePpcAction(a.id))}>
                Release
              </button>
            )}
            {!editing && (
              <button className={btn} disabled={pending} onClick={cancel}>
                Cancel
              </button>
            )}
          </div>
        </td>
      </tr>
      {out && (
        <tr>
          <td colSpan={7} className="px-3 pb-2">
            <Feedback out={out} />
          </td>
        </tr>
      )}
    </>
  );
}

export function AllocationList({ items, lines }: { items: AllocationItem[]; lines: Opt[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No allocations in this range.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-muted-foreground">
          <tr>
            {["Production", "Style", "Line", "Date", "Qty", "Status", ""].map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <AllocationRow key={a.id} a={a} lines={lines} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Factory holiday ----------
export function HolidayManager({
  factoryId,
  holidays,
}: {
  factoryId: string;
  holidays: { id: string; dateKey: string; reason: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [out, setOut] = useState<Outcome | null>(null);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const o = readResult(await addHolidayAction({ factoryId, date, reason }));
      setOut(o);
      if (o.ok) {
        setDate("");
        setReason("");
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      const o = readResult(await removeHolidayAction(id));
      setOut(o);
      if (o.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <input required type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          required
          minLength={2}
          placeholder="Reason (e.g. Eid holiday)"
          className={`${input} w-64`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button type="submit" disabled={pending} className={buttonVariants({ variant: "outline" })}>
          Add holiday
        </button>
      </form>
      <Feedback out={out} />
      {holidays.length > 0 && (
        <ul className="space-y-1 text-sm">
          {holidays.map((h) => (
            <li key={h.id} className="flex items-center gap-3">
              <span>
                {h.dateKey} · {h.reason}
              </span>
              <button className={btn} disabled={pending} onClick={() => remove(h.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
