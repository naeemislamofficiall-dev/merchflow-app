"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSeasonAction, updateSeasonAction } from "./actions";

const input = "h-9 w-full rounded-md border bg-background px-3 text-sm";

export function SeasonForm({ id, initial }: { id?: string; initial?: { code: string; name: string } }) {
  const router = useRouter();
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    setError("");
    start(async () => {
      const res = id ? await updateSeasonAction(id, { code, name }) : await createSeasonAction({ code, name });
      if (!res.ok) setError(res.error ?? "Failed");
      else router.push("/seasons");
    });
  }

  return (
    <div className="max-w-md space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium">Code</label>
        <input className={input} value={code} onChange={(e) => setCode(e.target.value)} placeholder="SS27" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Name</label>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring Summer 2027" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button disabled={pending} onClick={submit}>{id ? "Save season" : "Create season"}</Button>
    </div>
  );
}