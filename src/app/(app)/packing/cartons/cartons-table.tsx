"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type CartonRow = {
  id: string;
  cartonNo: string;
  packType: string;
  pieces: number;
  grossWeight: string;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, CartonRow>[] = [
  {
    accessorKey: "cartonNo",
    header: "Carton",
    cell: ({ row }) => (
      <Link href={`/packing/cartons/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.cartonNo}
      </Link>
    ),
  },
  { accessorKey: "packType", header: "Pack type" },
  { accessorKey: "pieces", header: "Pieces" },
  { accessorKey: "grossWeight", header: "Gross (kg)" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function CartonsTable({ rows }: { rows: CartonRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search cartons..." emptyText="No cartons yet" />;
}