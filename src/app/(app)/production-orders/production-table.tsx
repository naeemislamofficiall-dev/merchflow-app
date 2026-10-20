"use client";

import Link from "next/link";
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
      <Link href={`/production-orders/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
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
      <span>
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
];

export function ProductionTable({ rows }: { rows: ProductionRow[] }) {
  return (
    <DataTable columns={columns} data={rows} searchPlaceholder="Search production orders..." emptyText="No production orders yet" />
  );
}