"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type EnquiryRow = {
  id: string;
  enquiryNo: string;
  buyer: string;
  items: number;
  units: number;
  requiredShipDate: string;
  value: string;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, EnquiryRow>[] = [
  {
    accessorKey: "enquiryNo",
    header: "Enquiry",
    cell: ({ row }) => (
      <Link href={`/enquiries/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.enquiryNo}
      </Link>
    ),
  },
  { accessorKey: "buyer", header: "Buyer" },
  { accessorKey: "items", header: "Items" },
  { accessorKey: "units", header: "Units", cell: ({ row }) => row.original.units.toLocaleString("en-US") },
  { accessorKey: "value", header: "Target value" },
  { accessorKey: "requiredShipDate", header: "Required ship" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function EnquiriesTable({ rows }: { rows: EnquiryRow[] }) {
  return (
    <DataTable columns={columns} data={rows} searchPlaceholder="Search enquiries..." emptyText="No enquiries yet" />
  );
}