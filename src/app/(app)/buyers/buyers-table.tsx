"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type BuyerRow = {
  id: string;
  code: string;
  name: string;
  country: string;
  currency: string;
  paymentTerms: string;
  status: string;
};

// কলাম-এর সংজ্ঞা (cell-এ ফাংশন আছে) তাই এটা client ফাইলে থাকতে হয়
const columns: ColumnDef<AppTableFeatures, BuyerRow>[] = [
  { accessorKey: "code", header: "Code" },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link href={`/buyers/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: "country", header: "Country" },
  { accessorKey: "currency", header: "Currency" },
  { accessorKey: "paymentTerms", header: "Payment terms" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function BuyersTable({ rows }: { rows: BuyerRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search buyers..." emptyText="No buyers yet" />;
}