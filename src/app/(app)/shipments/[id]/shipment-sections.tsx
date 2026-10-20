"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  addContainerAction,
  allocateCartonsAction,
  deallocateCartonAction,
  removeContainerAction,
} from "../actions";

type CartonItem = { id: string; cartonNo: string; qty: number };
type ContainerItem = { id: string; containerNo: string; containerType: string; sealNo: string };
type ContainerValues = { containerNo: string; containerType: string; sealNo: string };

export function ShipmentSections({
  shipmentId,
  cartonsEditable,
  containersEditable,
  cartons,
  available,
  containers,
}: {
  shipmentId: string;
  cartonsEditable: boolean;
  containersEditable: boolean;
  cartons: CartonItem[];
  available: CartonItem[];
  containers: ContainerItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset } = useForm<ContainerValues>({
    defaultValues: { containerNo: "", containerType: "", sealNo: "" },
  });

  function run(fn: () => Promise<{ ok: boolean }>, after?: () => void) {
    setError("");
    start(async () => {
      const res = (await fn()) as { ok: boolean; error?: string };
      if (!res.ok) {
        setError(res.error ?? "Failed");
        return;
      }
      after?.();
      router.refresh();
    });
  }

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function addContainer(v: ContainerValues) {
    if (v.containerNo.trim().length < 4) {
      setError("Container number needs at least 4 characters");
      return;
    }
    run(() => addContainerAction(shipmentId, v), () => reset());
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Cartons in this shipment</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Carton</TableHead>
                <TableHead className="text-right">Pieces</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cartons.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                    No cartons yet
                  </TableCell>
                </TableRow>
              ) : (
                cartons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.cartonNo}</TableCell>
                    <TableCell className="text-right">{c.qty}</TableCell>
                    <TableCell className="text-right">
                      {cartonsEditable && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => run(() => deallocateCartonAction(shipmentId, c.id))}
                        >
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {cartonsEditable && (
        <Card>
          <CardHeader>
            <CardTitle>Add cartons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {available.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No closed cartons are free for this buyer and factory.
              </p>
            ) : (
              <>
                <div className="grid gap-2 md:grid-cols-3">
                  {available.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                      <input type="checkbox" checked={picked.includes(c.id)} onChange={() => toggle(c.id)} />
                      <span className="font-medium">{c.cartonNo}</span>
                      <span className="text-muted-foreground">{c.qty} pcs</span>
                    </label>
                  ))}
                </div>
                <Button
                  size="sm"
                  disabled={pending || picked.length === 0}
                  onClick={() => run(() => allocateCartonsAction(shipmentId, picked), () => setPicked([]))}
                >
                  Add selected ({picked.length})
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Containers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Container no</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Seal no</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {containers.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                    No containers
                  </TableCell>
                </TableRow>
              ) : (
                containers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.containerNo}</TableCell>
                    <TableCell>{c.containerType || "-"}</TableCell>
                    <TableCell>{c.sealNo || "-"}</TableCell>
                    <TableCell className="text-right">
                      {containersEditable && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => run(() => removeContainerAction(shipmentId, c.id))}
                        >
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {containersEditable && (
            <form onSubmit={handleSubmit(addContainer)} className="grid items-end gap-3 border-t p-4 md:grid-cols-4">
              <FormField label="Container no" htmlFor="c-no">
                <Input id="c-no" maxLength={20} {...register("containerNo")} />
              </FormField>
              <FormField label="Type" htmlFor="c-type" hint="Example: 40HC">
                <Input id="c-type" maxLength={20} {...register("containerType")} />
              </FormField>
              <FormField label="Seal no" htmlFor="c-seal">
                <Input id="c-seal" maxLength={30} {...register("sealNo")} />
              </FormField>
              <Button disabled={pending}>Add container</Button>
            </form>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}