"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import {
  cancelSubcontractAction,
  closeSubcontractAction,
  completeQcAction,
  confirmVendorAction,
  receiveReturnAction,
  startProcessAction,
} from "../actions";

type ReturnValues = {
  receiptDate: string;
  challanNo: string;
  receivedQty: string;
  damageQty: string;
  rejectQty: string;
  remarks: string;
};

const isCount = (v: string) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0);

export function SubcontractPanel({
  subcontractId,
  status,
  balance,
}: {
  subcontractId: string;
  status: string;
  balance: number;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset } = useForm<ReturnValues>({
    defaultValues: {
      receiptDate: new Date().toISOString().slice(0, 10),
      challanNo: "",
      receivedQty: "",
      damageQty: "",
      rejectQty: "",
      remarks: "",
    },
  });

  function run(fn: () => Promise<{ ok: boolean }>) {
    setError("");
    start(async () => {
      const res = (await fn()) as { ok: boolean; error?: string };
      if (!res.ok) setError(res.error ?? "Failed");
      else router.refresh();
    });
  }

  function cancel() {
    const reason = window.prompt("Why is this subcontract order being cancelled?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A reason is required (at least 3 characters)");
      return;
    }
    run(() => cancelSubcontractAction(subcontractId, reason.trim()));
  }

  function close() {
    let reason = "";
    if (balance > 0) {
      const r = window.prompt(`${balance} pieces are still not accounted for. Why are you closing it?`);
      if (r === null) return;
      if (r.trim().length < 3) {
        setError("A reason is required (at least 3 characters)");
        return;
      }
      reason = r.trim();
    }
    run(() => closeSubcontractAction(subcontractId, reason));
  }

  function receive(v: ReturnValues) {
    setError("");
    if (!isCount(v.receivedQty) || !isCount(v.damageQty) || !isCount(v.rejectQty)) {
      setError("Quantities must be whole numbers, 0 or more");
      return;
    }
    const total = Number(v.receivedQty || 0) + Number(v.damageQty || 0) + Number(v.rejectQty || 0);
    if (total <= 0) {
      setError("Enter at least one quantity");
      return;
    }
    if (total > balance) {
      setError(`Total ${total} is more than the balance ${balance}`);
      return;
    }
    if (!v.receiptDate) {
      setError("Select the date");
      return;
    }
    start(async () => {
      const res = await receiveReturnAction({ ...v, subcontractId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      reset({ ...v, challanNo: "", receivedQty: "", damageQty: "", rejectQty: "", remarks: "" });
      router.refresh();
    });
  }

  if (status === "CLOSED" || status === "CANCELLED") return null;

  const canReceive = status === "IN_PROCESS" || status === "RETURNED";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next step</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {status === "SENT" && (
            <>
              <Button size="sm" disabled={pending} onClick={() => run(() => confirmVendorAction(subcontractId))}>
                Vendor received the goods
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={cancel}>
                Cancel
              </Button>
            </>
          )}
          {status === "VENDOR_RECEIVED" && (
            <Button size="sm" disabled={pending} onClick={() => run(() => startProcessAction(subcontractId))}>
              Process started
            </Button>
          )}
          {status === "RETURNED" && (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => completeQcAction(subcontractId))}>
              Returned goods passed QC
            </Button>
          )}
          {status === "QC_DONE" && (
            <Button size="sm" disabled={pending} onClick={close}>
              Close
            </Button>
          )}
        </div>

        {canReceive && (
          <form onSubmit={handleSubmit(receive)} className="space-y-4 border-t pt-4">
            <p className="text-sm text-muted-foreground">Record goods that came back. Balance now: {balance} pieces.</p>
            <div className="grid gap-4 md:grid-cols-5">
              <FormField label="Date" htmlFor="r-date" required>
                <Input id="r-date" type="date" {...register("receiptDate")} />
              </FormField>
              <FormField label="Return challan" htmlFor="r-challan">
                <Input id="r-challan" maxLength={60} {...register("challanNo")} />
              </FormField>
              <FormField label="Good pieces" htmlFor="r-good">
                <Input id="r-good" type="number" step="1" min="0" {...register("receivedQty")} />
              </FormField>
              <FormField label="Damaged" htmlFor="r-dmg">
                <Input id="r-dmg" type="number" step="1" min="0" {...register("damageQty")} />
              </FormField>
              <FormField label="Rejected" htmlFor="r-rej">
                <Input id="r-rej" type="number" step="1" min="0" {...register("rejectQty")} />
              </FormField>
            </div>
            <FormField label="Remarks" htmlFor="r-remarks">
              <Input id="r-remarks" maxLength={500} {...register("remarks")} />
            </FormField>
            <Button size="sm" disabled={pending}>
              Record return
            </Button>
          </form>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}