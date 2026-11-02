"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requestApprovalAction } from "./request-actions";

export function RequestApprovalButton(props: { entityType: string; entityId: string; title: string; amount?: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  function go() {
    setMsg("");
    start(async () => {
      const res = await requestApprovalAction(props);
      if (!res.ok) setMsg(res.error ?? "Failed");
      else router.push(`/approvals/${res.data.id}`);
    });
  }

  return (
    <div className="space-y-1">
      <Button size="sm" variant="outline" disabled={pending} onClick={go}>Request approval</Button>
      {msg && <p className="text-xs text-destructive">{msg}</p>}
    </div>
  );
}