"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type CapaRow = {
  id: string;
  capaNo: string;
  title: string;
  category: string;
  dueDate: string;
  overdue: boolean;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, CapaRow>[] = [
  {
    accessorKey: "capaNo",
    header: "CAPA no",
    cell: ({ row }) => (
      <Link href={`/quality/capa/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.capaNo}
      </Link>
    ),
  },
  { accessorKey: "title", header: "Title" },
  { accessorKey: "category", header: "Category" },
  {
    accessorKey: "dueDate",
    header: "Due",
    cell: ({ row }) => (
      <span className={row.original.overdue ? "text-destructive" : ""}>
        {row.original.dueDate}
        {row.original.overdue ? " (late)" : ""}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function CapaTable({ rows }: { rows: CapaRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search CAPAs..." emptyText="No CAPAs yet" />;
}