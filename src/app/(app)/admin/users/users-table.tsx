"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, RotateCcw, Search } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  access: string;
  lastLogin: string;
  status: string;
};

const AVATAR_COLORS = ["bg-blue-600", "bg-violet-500", "bg-emerald-500", "bg-orange-400", "bg-teal-500", "bg-pink-500"];


const avatarColor = (name: string) =>
  AVATAR_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

const humanize = (s: string) => {
  const t = s.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function UserAvatar({ name }: { name: string }) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
        avatarColor(name)
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-slate-400")} />
      {humanize(status)}
    </span>
  );
}

const columns: ColumnDef<AppTableFeatures, UserRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link href={`/admin/users/${row.original.id}`} className="flex items-center gap-3">
        <UserAvatar name={row.original.name} />
        <span className="font-semibold text-navy-800 hover:text-blue-600 hover:underline">{row.original.name}</span>
      </Link>
    ),
  },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <span className="inline-block whitespace-nowrap rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
        {row.original.role}
      </span>
    ),
  },
  { accessorKey: "access", header: "Access" },
  { accessorKey: "lastLogin", header: "Last login" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusPill status={row.original.status} />,
  },
  {
    id: "action",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => (
      <Link
        href={`/admin/users/${row.original.id}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-navy-800 shadow-xs transition-colors hover:border-blue-300 hover:bg-blue-50"
      >
        <Pencil className="h-4 w-4" /> Edit
      </Link>
    ),
  },
];

const select =
  "h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-ink shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";

export function UsersTable({ rows }: { rows: UserRow[] }) {
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  const roles = [...new Set(rows.map((r) => r.role))];
  const statuses = [...new Set(rows.map((r) => r.status))];
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (!role || r.role === role) &&
      (!status || r.status === status) &&
      (!needle || [r.name, r.email, r.role, r.access].some((x) => x.toLowerCase().includes(needle)))
  );

  function reset() {
    setDraft("");
    setQ("");
    setRole("");
    setStatus("");
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQ(draft);
        }}
        className="flex flex-wrap items-end gap-4 rounded-card border border-slate-100 bg-white p-5 shadow-card"
      >
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (!e.target.value) setQ("");
            }}
            placeholder="Search users by name, email, role..."
            aria-label="Search users"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-3 text-sm text-ink shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20"
          />
        </div>
        <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)} className={cn(select, "min-w-40")}>
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={cn(select, "min-w-40")}>
            <option value="">All Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
        >
          <Search className="h-4 w-4" strokeWidth={2.5} /> Search
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-navy-800 shadow-xs hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </form>

      <DataTable
        columns={columns}
        data={shown}
        emptyText="No users found"
        rich
        noSearch
        rowsFooter
        pageNumber
        rowLabel="users"
      />
    </div>
  );
}