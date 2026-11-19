"use client";

import { useActionState, useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar } from "@/components/layout/avatar";
import { updateProfileAction, type ProfileResult } from "./actions";

const field =
  "w-full rounded-lg border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-muted disabled:text-muted-foreground";

export function ProfileForm({
  name,
  email,
  role,
  avatarUrl,
}: {
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}) {
  const [state, action, pending] = useActionState<ProfileResult | null, FormData>(updateProfileAction, null);
  const [value, setValue] = useState(name);
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [clientError, setClientError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const shown = removed ? null : (preview ?? avatarUrl);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    setClientError("");
    if (!f) {
      setPreview(null);
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setClientError("Image must be 2 MB or smaller");
      setPreview(null);
      e.target.value = "";
      return;
    }
    setPreview(URL.createObjectURL(f));
    setRemoved(false);
  }

  function onRemove() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setRemoved(true);
    setClientError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form action={action} className="space-y-6 rounded-card border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar name={value || name} src={shown} className="h-24 w-24 text-2xl" />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium hover:bg-muted"
            >
              <Camera className="h-4 w-4" /> Change photo
            </button>
            {shown && (
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium text-destructive hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 2 MB. Shown as a circle.</p>
          <input ref={fileRef} type="file" name="avatar" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="sr-only" />
          <input type="hidden" name="removeAvatar" value={removed ? "1" : "0"} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            Full name
          </label>
          <input id="name" name="name" value={value} onChange={(e) => setValue(e.target.value)} className={field} required />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input value={email} disabled className={field} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Role</label>
          <input value={role || "-"} disabled className={field} />
        </div>
      </div>

      {(clientError || state) && (
        <p
          role="status"
          className={`text-sm ${clientError || !state?.ok ? "text-destructive" : "text-emerald-700"}`}
        >
          {clientError || (state?.ok ? state.message : state?.error)}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </button>
    </form>
  );
}