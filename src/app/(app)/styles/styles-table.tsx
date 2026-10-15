"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type StyleRow = {
  id: string;
  styleNo: string;
  name: string;
  buyer: string;
  category: string;
  season: string;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, StyleRow>[] = [
  {
    accessorKey: "styleNo",
    header: "Style no",
    cell: ({ row }) => (
      <Link href={`/styles/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.styleNo}
      </Link>
    ),
  },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "buyer", header: "Buyer" },
  { accessorKey: "category", header: "Category" },
  { accessorKey: "season", header: "Season" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function StylesTable({ rows }: { rows: StyleRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search styles..." emptyText="No styles yet" />;
}