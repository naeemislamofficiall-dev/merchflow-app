"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type SupplierRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  country: string;
  currency: string;
  leadTimeDays: string;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, SupplierRow>[] = [
  { accessorKey: "code", header: "Code" },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link href={`/suppliers/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => <span className="capitalize">{row.original.category.toLowerCase()}</span>,
  },
  { accessorKey: "country", header: "Country" },
  { accessorKey: "currency", header: "Currency" },
  { accessorKey: "leadTimeDays", header: "Lead time (days)" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function SuppliersTable({ rows }: { rows: SupplierRow[] }) {
  return (
    <DataTable columns={columns} data={rows} searchPlaceholder="Search suppliers..." emptyText="No suppliers yet" />
  );
}