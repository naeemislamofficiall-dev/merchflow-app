"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type SampleRow = {
  id: string;
  sampleNo: string;
  style: string;
  type: string;
  quantity: number;
  dueDate: string;
  revisions: number;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, SampleRow>[] = [
  {
    accessorKey: "sampleNo",
    header: "Sample",
    cell: ({ row }) => (
      <Link href={`/samples/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.sampleNo}
      </Link>
    ),
  },
  { accessorKey: "style", header: "Style" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "quantity", header: "Qty" },
  { accessorKey: "dueDate", header: "Due" },
  { accessorKey: "revisions", header: "Revisions" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function SamplesTable({ rows }: { rows: SampleRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search samples..." emptyText="No samples yet" />;
}