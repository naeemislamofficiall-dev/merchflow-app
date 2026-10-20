"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type GrnRow = {
  id: string;
  grnNo: string;
  poNo: string;
  warehouse: string;
  receivedDate: string;
  challanNo: string;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, GrnRow>[] = [
  {
    accessorKey: "grnNo",
    header: "GRN no",
    cell: ({ row }) => (
      <Link href={`/goods-receipts/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.grnNo}
      </Link>
    ),
  },
  { accessorKey: "poNo", header: "PO" },
  { accessorKey: "warehouse", header: "Warehouse" },
  { accessorKey: "receivedDate", header: "Received" },
  { accessorKey: "challanNo", header: "Challan" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function GrnsTable({ rows }: { rows: GrnRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search GRNs..." emptyText="No goods receipts yet" />;
}