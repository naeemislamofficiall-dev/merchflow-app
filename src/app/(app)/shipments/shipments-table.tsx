"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/data/table-features";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/detail/status-badge";

export type ShipmentRow = {
  id: string;
  shipmentNo: string;
  mode: string;
  destination: string;
  forwarder: string;
  cartons: number;
  plannedShipDate: string;
  status: string;
};

const columns: ColumnDef<AppTableFeatures, ShipmentRow>[] = [
  {
    accessorKey: "shipmentNo",
    header: "Shipment",
    cell: ({ row }) => (
      <Link href={`/shipments/${row.original.id}`} className="font-medium text-denim-700 hover:underline">
        {row.original.shipmentNo}
      </Link>
    ),
  },
  { accessorKey: "mode", header: "Mode" },
  { accessorKey: "destination", header: "Destination" },
  { accessorKey: "forwarder", header: "Forwarder" },
  { accessorKey: "cartons", header: "Cartons" },
  { accessorKey: "plannedShipDate", header: "Planned ship" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function ShipmentsTable({ rows }: { rows: ShipmentRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search shipments..." emptyText="No shipments yet" />;
}