"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const sel = "h-9 w-full rounded-md border bg-background px-2 text-sm";

export function UploadForm({ types }: { types: { key: string; label: string }[] }) {
  const router = useRouter();
  const [type, setType] = useState(types[0]?.key ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file) {
      setMsg("Choose a file first");
      return;
    }
    setBusy(true);
    setMsg("");
    const fd = new FormData();
    fd.set("type", type);
    fd.set("file", file);
    const res = await fetch("/import/upload", { method: "POST", body: fd });
    const json = (await res.json().catch(() => ({ error: "Upload failed" }))) as { id?: string; error?: string };
    setBusy(false);
    if (!res.ok || !json.id) {
      setMsg(json.error ?? "Upload failed");
      return;
    }
    router.push(`/import/${json.id}`);
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs text-muted-foreground">1. Import type
          <select className={`${sel} mt-1`} value={type} onChange={(e) => setType(e.target.value)}>
            {types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </label>
        <div className="text-xs text-muted-foreground">2. Template
          <div className="mt-2">
            <a className="text-sm underline" href={`/import/template?type=${type}`}>Download template (CSV)</a>
          </div>
        </div>
        <label className="text-xs text-muted-foreground">3. File (.xlsx or .csv, max 5 MB, 5000 rows)
          <input type="file" accept=".xlsx,.csv" className="mt-1 block w-full text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" disabled={busy} onClick={submit}>{busy ? "Validating..." : "Upload and validate"}</Button>
        {msg && <span className="text-sm text-red-600">{msg}</span>}
      </div>
    </div>
  );
}