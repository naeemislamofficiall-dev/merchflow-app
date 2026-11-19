"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type GrnRow = {
  id: string;
  grnNo: string;
  poNo: string;
  warehouse: string;
  receivedDate: string;
  challanNo: string;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, GrnRow>[] = [
  {
    accessorKey: "grnNo",
    header: "GRN no",
    cell: ({ row }) => (
      <Link href={`/goods-receipts/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.grnNo}
      </Link>
    ),
  },
  { accessorKey: "poNo", header: "PO" },
  { accessorKey: "warehouse", header: "Warehouse" },
  { accessorKey: "receivedDate", header: "Received" },
  { accessorKey: "challanNo", header: "Challan" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

// SHUDHU SAJANO: empty state-er chhobi (document + box). Kono data nei.
function GrnEmptyArt() {
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
      <GrnEmptyArt />
    </span>
    <p className="text-lg font-semibold text-navy-800">No goods receipts found!</p>
    <p className="text-sm text-slate-500">Create a new GRN to get started.</p>
    <Link
      href="/goods-receipts/new"
      className="mt-4 inline-flex h-12 items-center gap-2 rounded-full bg-blue-600 px-7 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
    >
      <Plus className="h-4 w-4" strokeWidth={2.5} /> New GRN
    </Link>
  </div>
);

export function GrnsTable({ rows }: { rows: GrnRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search GRN..."
      emptyText="No goods receipts yet"
      rich
      empty={EMPTY}
    />
  );
}