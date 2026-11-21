"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CloudUpload, Download, FileSpreadsheet, Info, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;

const STEPS = [
  { title: "Select Import Type", sub: "Choose what you want to import" },
  { title: "Upload File", sub: "Upload your data file" },
  { title: "Validate & Preview", sub: "Check for errors" },
  { title: "Confirm Import", sub: "Import your data" },
];

const field =
  "h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-navy-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";

export function UploadForm({ types }: { types: { key: string; label: string }[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState(types[0]?.key ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  // step 3 ar 4 detail page-e (/import/<id>) hoy
  const step = file ? 2 : 1;

  function pick(f: File | null | undefined) {
    if (!f) return;
    if (!/\.(xlsx|csv)$/i.test(f.name)) {
      setMsg("Only .xlsx or .csv files are allowed");
      return;
    }
    if (f.size > MAX_BYTES) {
      setMsg("The file is bigger than 5 MB");
      return;
    }
    setMsg("");
    setFile(f);
  }

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
    <div className="space-y-5">
      <ol className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-slate-100 bg-white p-5 shadow-card">
        {STEPS.map((s, i) => {
          const no = i + 1;
          const done = no < step;
          const active = no === step;
          return (
            <li key={s.title} className="flex items-center gap-4">
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    done || active ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-500"
                  )}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : no}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-navy-800">{s.title}</span>
                  <span className="block text-xs text-slate-500">{s.sub}</span>
                </span>
              </span>
              {no < STEPS.length && <ArrowRight className="hidden h-4 w-4 text-blue-300 md:block" />}
            </li>
          );
        })}
      </ol>

      <div className="space-y-5 rounded-card border border-slate-100 bg-white p-5 shadow-card">
        <div className="grid gap-5 md:grid-cols-[minmax(240px,1fr)_minmax(200px,1fr)_minmax(240px,1fr)] md:items-start">
          <label className="space-y-1 text-sm">
            <span className="block font-semibold text-navy-800">1. Import Type</span>
            <span className="relative block">
              <FileSpreadsheet className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
              <select className={field} value={type} onChange={(e) => setType(e.target.value)}>
                {types.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </span>
          </label>

          <div className="space-y-1 text-sm">
            <span className="block font-semibold text-navy-800">2. Template</span>
            <a
              href={`/import/template?type=${type}`}
              className="inline-flex h-11 items-center gap-2 text-sm font-medium text-blue-600 underline-offset-2 hover:underline"
            >
              <Download className="h-4 w-4" /> Download template (CSV)
            </a>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-700">Supported Formats</p>
              <p className="text-xs text-slate-600">CSV, XLSX (Max: 5 MB, 5000 rows)</p>
            </div>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors",
            over ? "border-blue-500 bg-blue-50" : "border-blue-200 bg-blue-50/40 hover:bg-blue-50"
          )}
        >
          <CloudUpload className="h-9 w-9 text-blue-600" />
          {file ? (
            <>
              <p className="text-sm font-semibold text-navy-800">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB. Click to choose another file.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-navy-800">
                Drag &amp; drop your file here or click to <span className="text-blue-600">browse</span>
              </p>
              <p className="text-xs text-slate-500">Only CSV and XLSX files are allowed (Max 5 MB)</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" /> {busy ? "Validating..." : "Upload and validate"}
          </button>
          {msg && <span className="text-sm font-medium text-red-600">{msg}</span>}
        </div>
      </div>
    </div>
  );
}