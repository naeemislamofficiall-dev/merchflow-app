"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type BomRow = {
  id: string;
  styleNo: string;
  styleName: string;
  version: string;
  items: number;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, BomRow>[] = [
  {
    accessorKey: "styleNo",
    header: "Style",
    cell: ({ row }) => (
      <Link href={`/bom/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.styleNo}
      </Link>
    ),
  },
  { accessorKey: "styleName", header: "Name" },
  { accessorKey: "version", header: "Version" },
  { accessorKey: "items", header: "Items" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function BomsTable({ rows }: { rows: BomRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search BOMs..." emptyText="No BOMs yet" />;
}