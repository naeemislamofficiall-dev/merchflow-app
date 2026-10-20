"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";

export type InspectionRow = {
  id: string;
  inspectionNo: string;
  stage: string;
  operation: string;
  sampleSize: number;
  defectiveQty: number;
  defects: number;
  dhu: string;
  inspectedAt: string;
};

const columns: ColumnDef<AppTableFeatures, InspectionRow>[] = [
  {
    accessorKey: "inspectionNo",
    header: "Inspection",
    cell: ({ row }) => (
      <Link href={`/quality/inspections/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.inspectionNo}
      </Link>
    ),
  },
  { accessorKey: "stage", header: "Stage" },
  { accessorKey: "operation", header: "Operation" },
  { accessorKey: "sampleSize", header: "Checked" },
  { accessorKey: "defectiveQty", header: "Defective pcs" },
  { accessorKey: "defects", header: "Defects" },
  { accessorKey: "dhu", header: "DHU" },
  { accessorKey: "inspectedAt", header: "When" },
];

export function InspectionsTable({ rows }: { rows: InspectionRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search inspections..." emptyText="No inspections yet" />;
}