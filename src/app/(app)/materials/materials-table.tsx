"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type MaterialRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  reorderPoint: string;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, MaterialRow>[] = [
  { accessorKey: "code", header: "Code" },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link href={`/materials/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: "category", header: "Category" },
  { accessorKey: "unit", header: "Unit" },
  { accessorKey: "reorderPoint", header: "Reorder point" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function MaterialsTable({ rows }: { rows: MaterialRow[] }) {
  return (
    <DataTable columns={columns} data={rows} searchPlaceholder="Search materials..." emptyText="No materials yet" />
  );
}