"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type PoRow = {
  id: string;
  poNo: string;
  supplier: string;
  currency: string;
  total: string;
  lines: number;
  deliveryDate: string;
  createdAt: string;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, PoRow>[] = [
  {
    accessorKey: "poNo",
    header: "PO no",
    cell: ({ row }) => (
      <Link href={`/purchase-orders/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.poNo}
      </Link>
    ),
  },
  { accessorKey: "supplier", header: "Supplier" },
  { accessorKey: "lines", header: "Lines" },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => (
      <span>
        {row.original.total} {row.original.currency}
      </span>
    ),
  },
  { accessorKey: "deliveryDate", header: "Delivery" },
  { accessorKey: "createdAt", header: "Created" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function PosTable({ rows }: { rows: PoRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search POs..." emptyText="No purchase orders yet" />;
}
