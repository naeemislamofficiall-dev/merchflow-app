"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addLayAction, generateBundlesAction, markCutAction } from "../actions";

export type LayItem = {
  id: string;
  layNo: number;
  plies: number;
  actualPlies: number | null;
  status: string;
  markerLength: string;
  fabricUsed: string;
  hasBundles: boolean;
};

type LayValues = { plies: string; markerLength: string; markerWidthCm: string; markerEfficiencyPct: string };

export function LaySection({
  planId,
  planStatus,
  lays,
}: {
  planId: string;
  planStatus: string;
  lays: LayItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset } = useForm<LayValues>({
    defaultValues: { plies: "", markerLength: "", markerWidthCm: "", markerEfficiencyPct: "" },
  });

  const open = planStatus !== "COMPLETED" && planStatus !== "CANCELLED";

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

  function addLay(v: LayValues) {
    const plies = Number(v.plies);
    if (!Number.isInteger(plies) || plies <= 0) {
      setError("Plies must be a whole number more than 0");
      return;
    }
    run(() => addLayAction({ cutPlanId: planId, ...v }), () => reset());
  }

  function markCut(lay: LayItem) {
    const a = window.prompt(`Actual plies cut? Leave blank for the planned ${lay.plies}.`);
    if (a === null) return;
    const f = window.prompt("Fabric used? Leave blank to skip.");
    if (f === null) return;
    if ((a && !(Number(a) > 0)) || (f && !(Number(f) > 0))) {
      setError("Enter numbers more than 0, or leave the box blank");
      return;
    }
    run(() => markCutAction(lay.id, a.trim(), f.trim()));
  }

  function makeBundles(lay: LayItem) {
    const s = window.prompt("Maximum pieces per bundle (1 to 500)?", "20");
    if (s === null) return;
    const size = Number(s);
    if (!Number.isInteger(size) || size < 1 || size > 500) {
      setError("Bundle size must be a whole number from 1 to 500");
      return;
    }
    run(() => generateBundlesAction(lay.id, size));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lays</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Lay</TableHead>
              <TableHead>Plies</TableHead>
              <TableHead>Marker length</TableHead>
              <TableHead>Fabric used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lays.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                  No lays yet
                </TableCell>
              </TableRow>
            ) : (
              lays.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">L{l.layNo}</TableCell>
                  <TableCell>
                    {l.actualPlies !== null ? `${l.actualPlies} / ${l.plies}` : l.plies}
                  </TableCell>
                  <TableCell>{l.markerLength || "-"}</TableCell>
                  <TableCell>{l.fabricUsed || "-"}</TableCell>
                  <TableCell>
                    <StatusBadge status={l.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {l.status === "PLANNED" && (
                      <Button size="sm" disabled={pending} onClick={() => markCut(l)}>
                        Mark cut
                      </Button>
                    )}
                    {l.status === "CUT" && !l.hasBundles && (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => makeBundles(l)}>
                        Make bundles
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {open && (
          <form onSubmit={handleSubmit(addLay)} className="grid items-end gap-3 border-t p-4 md:grid-cols-5">
            <FormField label="Plies" htmlFor="lay-plies" required>
              <Input id="lay-plies" type="number" step="1" min="1" {...register("plies")} />
            </FormField>
            <FormField label="Marker length" htmlFor="lay-ml">
              <Input id="lay-ml" type="number" step="any" min="0" {...register("markerLength")} />
            </FormField>
            <FormField label="Marker width (cm)" htmlFor="lay-mw">
              <Input id="lay-mw" type="number" step="any" min="0" {...register("markerWidthCm")} />
            </FormField>
            <FormField label="Efficiency %" htmlFor="lay-eff">
              <Input id="lay-eff" type="number" step="any" min="0" max="100" {...register("markerEfficiencyPct")} />
            </FormField>
            <Button disabled={pending}>Add lay</Button>
          </form>
        )}
        {error && <p className="px-4 pb-4 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}