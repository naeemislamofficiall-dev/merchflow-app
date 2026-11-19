"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";

export type IssueRow = {
  id: string;
  issueNo: string;
  target: string;
  referenceNo: string;
  lines: number;
  issuedAt: string;
};

const columns: ColumnDef<AppTableFeatures, IssueRow>[] = [
  {
    accessorKey: "issueNo",
    header: "Issue no",
    cell: ({ row }) => (
      <Link href={`/material-issues/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.issueNo}
      </Link>
    ),
  },
  { accessorKey: "target", header: "Issued for" },
  { accessorKey: "referenceNo", header: "Reference" },
  { accessorKey: "lines", header: "Lines" },
  { accessorKey: "issuedAt", header: "Issued" },
  {
    id: "action",
    header: "Action",
    enableSorting: false,
    cell: ({ row }) => (
      <Link
        href={`/material-issues/${row.original.id}`}
        className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
      >
        View
      </Link>
    ),
  },
];

// SHUDHU SAJANO: empty state-er chhobi (document + box). Kono data nei.
function IssueEmptyArt() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden="true">
      <rect x="10" y="4" width="38" height="48" rx="6" fill="#dbeafe" />
      <g fill="#bfdbfe">
        <rect x="16" y="14" width="18" height="3.5" rx="1.75" />
        <rect x="16" y="23" width="12" height="3.5" rx="1.75" />
        <rect x="16" y="32" width="16" height="3.5" rx="1.75" />
      </g>
      <circle cx="46" cy="44" r="13" fill="#93c5fd" />
      <path
        d="M46 35l8 4.2v8.6L46 52l-8-4.2v-8.6z M38 39.2l8 4.4 8-4.4 M46 43.6V52"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

const EMPTY = (
  <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
    <span className="mb-2 animate-float">
      <IssueEmptyArt />
    </span>
    <p className="text-lg font-semibold text-navy-800">No material issues found!</p>
    <p className="text-sm text-slate-500">Create a new material issue to get started.</p>
    <Link
      href="/material-issues/new"
      className="mt-4 inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-7 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
    >
      <Plus className="h-4 w-4" strokeWidth={2.5} /> Issue material
    </Link>
  </div>
);

export function IssuesTable({ rows }: { rows: IssueRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search issues..."
      emptyText="No material issued yet"
      rich
      wideSearch
      searchLabel="Search"
      rowsFooter
      empty={EMPTY}
    />
  );
}