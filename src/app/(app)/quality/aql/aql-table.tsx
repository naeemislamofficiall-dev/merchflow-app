"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type AqlRow = {
  id: string;
  inspectionNo: string;
  stage: string;
  lotSize: number;
  sampleSize: number;
  found: string;
  result: string;
  createdAt: string;
};

const columns: ColumnDef<AppTableFeatures, AqlRow>[] = [
  {
    accessorKey: "inspectionNo",
    header: "AQL no",
    cell: ({ row }) => (
      <Link href={`/quality/aql/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.inspectionNo}
      </Link>
    ),
  },
  { accessorKey: "stage", header: "Stage" },
  { accessorKey: "lotSize", header: "Lot" },
  { accessorKey: "sampleSize", header: "Sample" },
  { accessorKey: "found", header: "Found (C / Maj / Min)" },
  {
    accessorKey: "result",
    header: "Result",
    cell: ({ row }) => <StatusBadge status={row.original.result} />,
  },
  { accessorKey: "createdAt", header: "Created" },
];

export function AqlTable({ rows }: { rows: AqlRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search AQL inspections..." emptyText="No AQL inspections yet" />;
}