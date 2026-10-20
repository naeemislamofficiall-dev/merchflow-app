"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  access: string;
  lastLogin: string;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, UserRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link href={`/admin/users/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "role", header: "Role" },
  { accessorKey: "access", header: "Access" },
  { accessorKey: "lastLogin", header: "Last login" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function UsersTable({ rows }: { rows: UserRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search users..." emptyText="No users yet" />;
}
