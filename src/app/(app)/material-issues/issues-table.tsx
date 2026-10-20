"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";

export type IssueRow = {
  id: string;
  issueNo: string;
  target: string;
  referenceNo: string;
  lines: number;
  issuedAt: string;
};

const columns: ColumnDef<AppTableFeatures, IssueRow>[] = [
  {
    accessorKey: "issueNo",
    header: "Issue no",
    cell: ({ row }) => (
      <Link href={`/material-issues/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.issueNo}
      </Link>
    ),
  },
  { accessorKey: "target", header: "Issued for" },
  { accessorKey: "referenceNo", header: "Reference" },
  { accessorKey: "lines", header: "Lines" },
  { accessorKey: "issuedAt", header: "Issued" },
];

export function IssuesTable({ rows }: { rows: IssueRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search issues..." emptyText="No material issued yet" />;
}