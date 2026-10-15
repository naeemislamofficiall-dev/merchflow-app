"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type OrderRow = {
  id: string;
  orderNo: string;
  buyerPoNo: string;
  buyer: string;
  shipDate: string;
  units: number;
  value: string;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, OrderRow>[] = [
  {
    accessorKey: "orderNo",
    header: "Order",
    cell: ({ row }) => (
      <Link href={`/orders/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.orderNo}
      </Link>
    ),
  },
  { accessorKey: "buyerPoNo", header: "Buyer PO" },
  { accessorKey: "buyer", header: "Buyer" },
  { accessorKey: "shipDate", header: "Ship date" },
  { accessorKey: "units", header: "Units", cell: ({ row }) => row.original.units.toLocaleString("en-US") },
  { accessorKey: "value", header: "Value" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search orders..." emptyText="No orders yet" />;
}