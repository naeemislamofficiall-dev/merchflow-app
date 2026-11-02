"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Res = { ok: boolean; error?: string; data?: unknown };

// goto: "/textile/knitting/{id}" opens the detail page after create. Without goto the page just refreshes.
export function ActionForm({
  action, submitLabel, goto, children, className,
}: {
  action: (fd: FormData) => Promise<Res>;
  submitLabel: string;
  goto?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className={className ?? "space-y-3"}
      action={(fd) => {
        setError("");
        start(async () => {
          const res = await action(fd);
          if (!res.ok) {
            setError(String(res.error ?? "Something went wrong"));
            return;
          }
          const id = (res.data as { id?: string } | undefined)?.id ?? "";
          if (goto) router.push(goto.replace("{id}", id));
          else router.refresh();
        });
      }}
    >
      {children}
      {error && <p className="rounded bg-red-50 px-2 py-1 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-denim-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Please wait..." : submitLabel}
      </button>
    </form>
  );
}