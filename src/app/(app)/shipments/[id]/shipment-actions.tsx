"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  bookShipmentAction,
  cancelShipmentAction,
  closeShipmentAction,
  deliverShipmentAction,
  documentsReadyAction,
  planShipmentAction,
  shipShipmentAction,
} from "../actions";

export function ShipmentActions({ shipmentId, status }: { shipmentId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean }>) {
    setError("");
    start(async () => {
      const res = (await fn()) as { ok: boolean; error?: string };
      if (!res.ok) setError(res.error ?? "Failed");
      else router.refresh();
    });
  }

  function cancel() {
    const reason = window.prompt("Why is this shipment being cancelled?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A reason is required (at least 3 characters)");
      return;
    }
    run(() => cancelShipmentAction(shipmentId, reason.trim()));
  }

  function ship() {
    if (!window.confirm("Mark as shipped? The cartons and the order status will be updated.")) return;
    run(() => shipShipmentAction(shipmentId));
  }

  const buttons: React.ReactNode[] = [];
  const add = (key: string, label: string, onClick: () => void, outline = false) =>
    buttons.push(
      <Button key={key} size="sm" variant={outline ? "outline" : undefined} disabled={pending} onClick={onClick}>
        {label}
      </Button>
    );

  if (status === "DRAFT") add("plan", "Mark as planned", () => run(() => planShipmentAction(shipmentId)));
  if (status === "PLANNED") add("docs", "Documents ready", () => run(() => documentsReadyAction(shipmentId)));
  if (status === "DOCUMENTS_READY") add("book", "Book", () => run(() => bookShipmentAction(shipmentId)));
  if (status === "BOOKED") add("ship", "Ship", ship);
  if (status === "SHIPPED") add("deliver", "Mark delivered", () => run(() => deliverShipmentAction(shipmentId)));
  if (status === "DELIVERED") add("close", "Close", () => run(() => closeShipmentAction(shipmentId)), true);
  if (["DRAFT", "PLANNED", "DOCUMENTS_READY", "BOOKED"].includes(status)) add("cancel", "Cancel", cancel, true);

  if (buttons.length === 0) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">{buttons}</div>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}