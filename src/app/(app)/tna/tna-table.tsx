"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type PlanRow = {
  id: string;
  style: string;
  shipDate: string;
  progress: string;
  delayed: number;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, PlanRow>[] = [
  {
    accessorKey: "style",
    header: "Style",
    cell: ({ row }) => (
      <Link href={`/tna/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.style}
      </Link>
    ),
  },
  { accessorKey: "shipDate", header: "Ship date" },
  { accessorKey: "progress", header: "Completed" },
  { accessorKey: "delayed", header: "Delayed" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function TnaTable({ rows }: { rows: PlanRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search plans..." emptyText="No T&A plans yet" />;
}