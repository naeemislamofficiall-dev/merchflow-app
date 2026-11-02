"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { confirmImportAction } from "./actions";

export function ConfirmButton({ id, count }: { id: string; count: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg("");
            const res = await confirmImportAction(id);
            if (!res.ok) setMsg(res.error);
            router.refresh();
          })
        }
      >
        {pending ? "Importing..." : `Confirm import (${count} rows)`}
      </Button>
      {msg && <span className="text-sm text-red-600">{msg}</span>}
    </div>
  );
}