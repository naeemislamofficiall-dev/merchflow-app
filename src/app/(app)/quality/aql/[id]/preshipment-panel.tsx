"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { registerDocumentAction } from "@/app/(app)/documents/actions";
import { savePreshipmentReportAction } from "../preshipment-actions";

export type ReportInit = {
  cartonsTotal: string;
  cartonsChecked: string;
  packingOk: string;
  labelingOk: string;
  measurementOk: string;
  workmanshipOk: string;
  summary: string;
  inspectedByName: string;
};
export type FileItem = { id: string; fileName: string; docType: string | null; storageUrl: string | null };

const input = "h-9 rounded-md border bg-background px-2 text-sm";
const EMPTY: ReportInit = {
  cartonsTotal: "", cartonsChecked: "", packingOk: "", labelingOk: "",
  measurementOk: "", workmanshipOk: "", summary: "", inspectedByName: "",
};

function YesNo(props: { label: string; value: string; disabled: boolean; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {props.label}
      <select className={input} value={props.value} disabled={props.disabled} onChange={(e) => props.onChange(e.target.value)}>
        <option value="">Not checked</option>
        <option value="yes">OK</option>
        <option value="no">Not OK</option>
      </select>
    </label>
  );
}

export function PreshipmentPanel(props: { aqlId: string; locked: boolean; initial: ReportInit | null; files: FileItem[] }) {
  const router = useRouter();
  const [f, setF] = useState<ReportInit>(props.initial ?? EMPTY);
  const [doc, setDoc] = useState({ fileName: "", storageUrl: "" });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const set = (k: keyof ReportInit) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  function saveReport() {
    setMsg("");
    start(async () => {
      const res = await savePreshipmentReportAction(props.aqlId, f);
      setMsg(res.ok ? "Report saved" : (res.error ?? "Failed"));
      if (res.ok) router.refresh();
    });
  }

  function addFile() {
    setMsg("");
    start(async () => {
      const res = await registerDocumentAction({
        entityType: "AqlInspection",
        entityId: props.aqlId,
        fileName: doc.fileName,
        docType: "PRESHIPMENT_REPORT",
        storageUrl: doc.storageUrl,
        expiryDate: "",
        access: "COMPANY",
      });
      if (!res.ok) setMsg(res.error ?? "Failed");
      else {
        setDoc({ fileName: "", storageUrl: "" });
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pre-shipment report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">Total cartons
            <input className={`${input} w-28`} disabled={props.locked} value={f.cartonsTotal} onChange={(e) => set("cartonsTotal")(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">Cartons checked
            <input className={`${input} w-28`} disabled={props.locked} value={f.cartonsChecked} onChange={(e) => set("cartonsChecked")(e.target.value)} />
          </label>
          <YesNo label="Packing" value={f.packingOk} disabled={props.locked} onChange={set("packingOk")} />
          <YesNo label="Labeling" value={f.labelingOk} disabled={props.locked} onChange={set("labelingOk")} />
          <YesNo label="Measurement" value={f.measurementOk} disabled={props.locked} onChange={set("measurementOk")} />
          <YesNo label="Workmanship" value={f.workmanshipOk} disabled={props.locked} onChange={set("workmanshipOk")} />
        </div>
        <div className="flex flex-wrap gap-3">
          <input className={`${input} w-48`} placeholder="Inspector name" disabled={props.locked} value={f.inspectedByName} onChange={(e) => set("inspectedByName")(e.target.value)} />
          <input className={`${input} min-w-72 flex-1`} placeholder="Summary of findings" disabled={props.locked} value={f.summary} onChange={(e) => set("summary")(e.target.value)} />
          {!props.locked && <Button disabled={pending} onClick={saveReport}>Save report</Button>}
        </div>
        {props.locked && <p className="text-muted-foreground">The result is recorded, so the report is locked.</p>}

        <div className="border-t pt-3">
          <p className="mb-1 font-medium">Attachments</p>
          {props.files.length === 0 && <p className="text-muted-foreground">No attachments yet.</p>}
          {props.files.map((x) => (
            <p key={x.id}>
              {x.storageUrl ? <a href={x.storageUrl} target="_blank" rel="noreferrer" className="text-denim-700 hover:underline">{x.fileName}</a> : x.fileName}
            </p>
          ))}
          <div className="mt-2 flex flex-wrap gap-2">
            <input className={`${input} w-56`} placeholder="File name" value={doc.fileName} onChange={(e) => setDoc({ ...doc, fileName: e.target.value })} />
            <input className={`${input} min-w-72 flex-1`} placeholder="File link (Drive / SharePoint / web)" value={doc.storageUrl} onChange={(e) => setDoc({ ...doc, storageUrl: e.target.value })} />
            <Button variant="outline" disabled={pending} onClick={addFile}>Add attachment</Button>
          </div>
        </div>
        {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      </CardContent>
    </Card>
  );
}