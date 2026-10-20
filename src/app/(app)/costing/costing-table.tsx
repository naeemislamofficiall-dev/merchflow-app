"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type SheetRow = {
  id: string;
  style: string;
  version: string;
  type: string;
  currency: string;
  totalCost: string;
  quotedPrice: string;
  margin: string;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, SheetRow>[] = [
  {
    accessorKey: "style",
    header: "Style",
    cell: ({ row }) => (
      <Link href={`/costing/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.style}
      </Link>
    ),
  },
  { accessorKey: "version", header: "Version" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "currency", header: "Currency" },
  { accessorKey: "totalCost", header: "Total cost" },
  { accessorKey: "margin", header: "Margin" },
  { accessorKey: "quotedPrice", header: "Quoted price" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function CostingTable({ rows }: { rows: SheetRow[] }) {
  return (
    <DataTable columns={columns} data={rows} searchPlaceholder="Search costing..." emptyText="No costing sheets yet" />
  );
}