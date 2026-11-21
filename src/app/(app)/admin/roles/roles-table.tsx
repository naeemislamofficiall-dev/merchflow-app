"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, List, Lock, Pencil, Search, ShieldCheck, Users } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";

export type RoleRow = {
  id: string;
  name: string;
  description: string;
  isAdmin: boolean;
  permissionCount: number;
  users: number;
  canManage: boolean;
};

const columns: ColumnDef<AppTableFeatures, RoleRow>[] = [
  {
    accessorKey: "name",
    header: "Role",
    cell: ({ row }) => (
      <Link href={`/admin/roles/${row.original.id}`} className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <span className="font-semibold text-navy-800 hover:text-blue-600 hover:underline">{row.original.name}</span>
      </Link>
    ),
  },
  { accessorKey: "description", header: "Description" },
  {
    accessorKey: "permissionCount",
    header: "Permissions",
    cell: ({ row }) => {
      const r = row.original;
      if (r.isAdmin) {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Lock className="h-3.5 w-3.5" /> Full access
          </span>
        );
      }
      if (r.permissionCount > 0) {
        return (
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {r.permissionCount} permissions
          </span>
        );
      }
      return (
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          No internal permissions
        </span>
      );
    },
  },
  {
    accessorKey: "users",
    header: "Users",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2 tabular-nums">
        <Users className="h-4 w-4 text-blue-600" /> {row.original.users}
      </span>
    ),
  },
  {
    id: "action",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => (
      <Link
        href={`/admin/roles/${row.original.id}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-navy-800 shadow-xs transition-colors hover:border-blue-300 hover:bg-blue-50"
      >
        {row.original.canManage ? (
          <>
            <Pencil className="h-4 w-4" /> Edit
          </>
        ) : (
          <>
            <Eye className="h-4 w-4" /> View
          </>
        )}
      </Link>
    ),
  },
];

export function RolesTable({ rows }: { rows: RoleRow[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? rows.filter((r) => [r.name, r.description].some((x) => x.toLowerCase().includes(needle)))
    : rows;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-heading text-xl font-semibold text-navy-800">
          <List className="h-5 w-5 text-blue-600" /> Roles List
        </h2>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search roles..."
            aria-label="Search roles"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-ink shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20"
          />
        </div>
      </div>
      <DataTable
        columns={columns}
        data={shown}
        emptyText="No roles found"
        rich
        noSearch
        rowsFooter
        pageNumber
        rowLabel="roles"
      />
    </div>
  );
}