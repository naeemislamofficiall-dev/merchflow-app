"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, Filter } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type ProductionRow = {
  id: string;
  productionNo: string;
  order: string;
  style: string;
  factory: string;
  line: string;
  quantity: number;
  completedQty: number;
  startDate: string;
  endDate: string;
  priority: number;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, ProductionRow>[] = [
  {
    accessorKey: "productionNo",
    header: "Production no",
    cell: ({ row }) => (
      <Link
        href={`/production-orders/${row.original.id}`}
        className="font-semibold text-navy-800 hover:text-blue-600 hover:underline"
      >
        {row.original.productionNo}
      </Link>
    ),
  },
  { accessorKey: "order", header: "Order" },
  { accessorKey: "style", header: "Style" },
  { accessorKey: "factory", header: "Factory" },
  { accessorKey: "line", header: "Line" },
  {
    accessorKey: "quantity",
    header: "Qty",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.completedQty} / {row.original.quantity}
      </span>
    ),
  },
  { accessorKey: "startDate", header: "Start" },
  { accessorKey: "endDate", header: "End" },
  { accessorKey: "priority", header: "Priority" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "action",
    header: "Action",
    enableSorting: false,
    cell: ({ row }) => (
      <Link
        href={`/production-orders/${row.original.id}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-navy-800 shadow-xs transition-colors hover:border-blue-300 hover:bg-blue-50"
      >
        <Eye className="h-4 w-4" /> View
      </Link>
    ),
  },
];

export function ProductionTable({ rows }: { rows: ProductionRow[] }) {
  const [status, setStatus] = useState("");
  const statuses = [...new Set(rows.map((r) => r.status))];
  const shown = status ? rows.filter((r) => r.status === status) : rows;

  const filter = (
    <label className="inline-flex h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-navy-800 shadow-xs">
      <Filter className="h-4 w-4" />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        aria-label="Filter by status"
        className="bg-transparent capitalize focus:outline-none"
      >
        <option value="">All statuses</option>
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ").toLowerCase()}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <DataTable
      columns={columns}
      data={shown}
      searchPlaceholder="Search production orders..."
      emptyText="No production orders yet"
      rich
      wideSearch
      liveSearch
      rowsFooter
      pageNumber
      toolbar={filter}
    />
  );
}