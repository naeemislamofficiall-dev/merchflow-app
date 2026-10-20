"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type PrRow = {
  id: string;
  prNo: string;
  source: string;
  priority: string;
  lines: number;
  requiredDate: string;
  createdAt: string;
  status: string;
};

const label = (v: string) => v.replace(/_/g, " ").toLowerCase();

const columns: ColumnDef<AppTableFeatures, PrRow>[] = [
  {
    accessorKey: "prNo",
    header: "PR no",
    cell: ({ row }) => (
      <Link href={`/prs/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.prNo}
      </Link>
    ),
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => <span className="capitalize">{label(row.original.source)}</span>,
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => <span className="capitalize">{label(row.original.priority)}</span>,
  },
  { accessorKey: "lines", header: "Lines" },
  { accessorKey: "requiredDate", header: "Required by" },
  { accessorKey: "createdAt", header: "Created" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function PrsTable({ rows }: { rows: PrRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search PRs..." emptyText="No PRs yet" />;
}