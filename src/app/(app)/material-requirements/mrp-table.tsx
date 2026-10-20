"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";

export type MrpRow = {
  id: string;
  runDate: string;
  styleNo: string;
  bom: string;
  order: string;
  orderQty: number;
  lines: number;
  pr: string;
};

const columns: ColumnDef<AppTableFeatures, MrpRow>[] = [
  {
    accessorKey: "runDate",
    header: "Run date",
    cell: ({ row }) => (
      <Link href={`/material-requirements/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.runDate}
      </Link>
    ),
  },
  { accessorKey: "styleNo", header: "Style" },
  { accessorKey: "bom", header: "BOM" },
  { accessorKey: "order", header: "Order" },
  { accessorKey: "orderQty", header: "Quantity" },
  { accessorKey: "lines", header: "Items" },
  { accessorKey: "pr", header: "PR" },
];

export function MrpTable({ rows }: { rows: MrpRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search MRP runs..." emptyText="No MRP runs yet" />;
}