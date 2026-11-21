"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Layers, Plus, Shirt, Users } from "lucide-react";
import { createOrgAction, type OrgKind } from "./actions";

type Opt = { id: string; label: string };

const TITLE: Record<OrgKind, string> = {
  building: "Add Building",
  floor: "Add Floor",
  department: "Add Department",
  line: "Add Sewing Line",
};

const SUB: Record<OrgKind, string> = {
  building: "A building inside this factory",
  floor: "A floor inside a building",
  department: "A department, optionally on a floor",
  line: "A sewing line on a floor",
};

const ICON: Record<OrgKind, React.ReactNode> = {
  building: <Building2 className="h-5 w-5" />,
  floor: <Layers className="h-5 w-5" />,
  department: <Users className="h-5 w-5" />,
  line: <Shirt className="h-5 w-5" />,
};

const field =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";
const lbl = "block text-sm font-semibold text-navy-800";

export function OrgForm({
  kind,
  factoryId,
  buildings = [],
  floors = [],
  departments = [],
}: {
  kind: OrgKind;
  factoryId: string;
  buildings?: Opt[];
  floors?: Opt[];
  departments?: Opt[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values: Record<string, string> = {};
    new FormData(form).forEach((v, k) => {
      values[k] = String(v);
    });
    if (kind === "building" || kind === "department") values.factoryId = factoryId;

    setError("");
    start(async () => {
      const res = await createOrgAction(kind, values);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  const id = (s: string) => `${kind}-${s}`;

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-card border border-slate-100 bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          {ICON[kind]}
        </span>
        <div>
          <h2 className="font-heading text-lg font-semibold text-navy-800">{TITLE[kind]}</h2>
          <p className="text-xs text-slate-500">{SUB[kind]}</p>
        </div>
      </div>

      {kind === "floor" && (
        <div className="space-y-1">
          <label htmlFor={id("b")} className={lbl}>
            Building <span className="text-red-500">*</span>
          </label>
          <select id={id("b")} name="buildingId" className={field}>
            <option value="">Select...</option>
            {buildings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {(kind === "department" || kind === "line") && (
        <div className="space-y-1">
          <label htmlFor={id("f")} className={lbl}>
            Floor {kind === "line" && <span className="text-red-500">*</span>}
          </label>
          <select id={id("f")} name="floorId" className={field}>
            <option value="">{kind === "line" ? "Select..." : "None"}</option>
            {floors.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {kind === "line" && (
        <div className="space-y-1">
          <label htmlFor={id("d")} className={lbl}>
            Department
          </label>
          <select id={id("d")} name="departmentId" className={field}>
            <option value="">None</option>
            {departments.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor={id("c")} className={lbl}>
            Code <span className="text-red-500">*</span>
          </label>
          <input id={id("c")} name="code" maxLength={20} placeholder="e.g. B2" className={field} />
        </div>
        <div className="space-y-1">
          <label htmlFor={id("n")} className={lbl}>
            Name <span className="text-red-500">*</span>
          </label>
          <input id={id("n")} name="name" maxLength={100} placeholder="Enter name" className={field} />
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} /> {pending ? "Saving..." : TITLE[kind]}
      </button>
    </form>
  );
}