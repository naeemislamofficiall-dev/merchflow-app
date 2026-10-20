"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createResetLinkAction } from "../actions";

export function ResetLinkCard({ id }: { id: string }) {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function generate() {
    setError("");
    setCopied(false);
    start(async () => {
      const res = await createResetLinkAction(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLink(`${window.location.origin}${res.data.path}`);
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <div>
        <h2 className="font-semibold">Password reset link</h2>
        <p className="text-sm text-muted-foreground">
          Make a one-time link (valid for 1 hour) and send it to the user. They choose their own new password.
        </p>
      </div>
      <Button type="button" variant="outline" onClick={generate} disabled={pending}>
        {pending ? "Creating..." : link ? "Create a new link" : "Create reset link"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {link && (
        <div className="space-y-2">
          <input readOnly value={link} className="w-full rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button type="button" size="sm" onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      )}
    </Card>
  );
}
