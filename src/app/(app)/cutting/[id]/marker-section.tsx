"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addLayFromMarkerAction, addMarkerAction } from "../actions";

export type MarkerLay = { layNo: number; plies: number; status: string; bundles: number; pieces: number };
export type MarkerItem = {
  id: string;
  markerNo: number;
  widthCm: number;
  length: number;
  efficiencyPct: number;
  ratio: string;
  plannedPlies: number;
  cutPlies: number;
  plannedPieces: number;
  plannedFabric: number;
  lays: MarkerLay[];
};

const input = "h-9 rounded-md border bg-background px-2 text-sm";

export function MarkerSection(props: { planId: string; planStatus: string; markers: MarkerItem[] }) {
  const router = useRouter();
  const [f, setF] = useState({ widthCm: "", length: "", efficiencyPct: "", remarks: "" });
  const [plies, setPlies] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const canAddMarker = props.planStatus !== "CANCELLED" && props.planStatus !== "COMPLETED";
  const canAddLay = props.planStatus === "FABRIC_RESERVED" || props.planStatus === "CUTTING";

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError("");
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Failed");
      else {
        after?.();
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Markers (marker → lay → bundle)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.markers.length === 0 && <p className="text-sm text-muted-foreground">No markers yet.</p>}
        {props.markers.map((m) => (
          <div key={m.id} className="rounded-md border p-3 text-sm">
            <p className="font-medium">
              Marker {m.markerNo}: {m.widthCm} cm x {m.length} m, efficiency {m.efficiencyPct}%, ratio {m.ratio}
            </p>
            <p className="text-muted-foreground">
              Plies {m.cutPlies} cut / {m.plannedPlies} planned · {m.plannedPieces} pcs · fabric {m.plannedFabric.toFixed(2)}
            </p>
            <ul className="mt-1 list-disc pl-5">
              {m.lays.length === 0 && <li className="text-muted-foreground">No lays on this marker</li>}
              {m.lays.map((l) => (
                <li key={l.layNo}>
                  Lay {l.layNo}: {l.plies} plies, {l.status.toLowerCase()}, {l.bundles} bundle(s) / {l.pieces} pcs
                </li>
              ))}
            </ul>
            {canAddLay && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  className={`${input} w-24`}
                  placeholder="Plies"
                  value={plies[m.id] ?? ""}
                  onChange={(e) => setPlies((p) => ({ ...p, [m.id]: e.target.value }))}
                />
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(() => addLayFromMarkerAction(props.planId, m.id, plies[m.id] ?? ""), () =>
                      setPlies((p) => ({ ...p, [m.id]: "" }))
                    )
                  }
                >
                  Add lay with this marker
                </Button>
              </div>
            )}
          </div>
        ))}

        {canAddMarker && (
          <div className="flex flex-wrap items-end gap-2 border-t pt-3">
            <input className={`${input} w-28`} placeholder="Width (cm)" value={f.widthCm} onChange={(e) => setF({ ...f, widthCm: e.target.value })} />
            <input className={`${input} w-28`} placeholder="Length (m)" value={f.length} onChange={(e) => setF({ ...f, length: e.target.value })} />
            <input className={`${input} w-28`} placeholder="Efficiency %" value={f.efficiencyPct} onChange={(e) => setF({ ...f, efficiencyPct: e.target.value })} />
            <input className={`${input} w-48`} placeholder="Remarks" value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} />
            <Button
              disabled={pending}
              onClick={() =>
                run(() => addMarkerAction({ cutPlanId: props.planId, ...f }), () =>
                  setF({ widthCm: "", length: "", efficiencyPct: "", remarks: "" })
                )
              }
            >
              Add marker
            </Button>
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}