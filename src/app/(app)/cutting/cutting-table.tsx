"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type CutPlanRow = {
  id: string;
  cutPlanNo: string;
  productionNo: string;
  color: string;
  plannedPlies: number;
  plannedOutput: number;
  lays: string;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, CutPlanRow>[] = [
  {
    accessorKey: "cutPlanNo",
    header: "Cut plan",
    cell: ({ row }) => (
      <Link href={`/cutting/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.cutPlanNo}
      </Link>
    ),
  },
  { accessorKey: "productionNo", header: "Production order" },
  { accessorKey: "color", header: "Color" },
  { accessorKey: "plannedPlies", header: "Plies" },
  { accessorKey: "plannedOutput", header: "Output (pcs)" },
  { accessorKey: "lays", header: "Lays cut" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function CuttingTable({ rows }: { rows: CutPlanRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search cut plans..." emptyText="No cut plans yet" />;
}