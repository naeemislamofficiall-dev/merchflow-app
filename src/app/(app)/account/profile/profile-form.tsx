"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { Camera, CircleCheck, Loader2, Mail, RotateCcw, Shield, Trash2, Upload, User, UserCog } from "lucide-react";
import { Avatar } from "@/components/layout/avatar";
import { cn } from "@/lib/utils";
import { updateProfileAction, type ProfileResult } from "./actions";

const field =
  "h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-navy-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
const lbl = "mb-1.5 block text-sm font-semibold text-navy-800";

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

  function onReset() {
    if (preview) URL.revokeObjectURL(preview);
    setValue(name);
    setPreview(null);
    setRemoved(false);
    setClientError("");
  }

  return (
    <form
      action={action}
      onReset={onReset}
      className="rounded-card border border-slate-100 bg-white p-6 shadow-card"
    >
      <div className="grid gap-8 md:grid-cols-[260px_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-4">
          <Avatar name={value || name} src={shown} className="h-36 w-36 text-5xl" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 px-4 py-5 text-center hover:bg-blue-50"
          >
            <Upload className="h-6 w-6 text-blue-600" />
            <span className="text-sm font-semibold text-blue-600">
              <Camera className="mr-1 inline h-4 w-4" />
              {shown ? "Change Photo" : "Upload Photo"}
            </span>
            <span className="text-xs text-slate-500">JPG, PNG or WebP (Max 2MB)</span>
          </button>
          {shown && (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:underline"
            >
              <Trash2 className="h-4 w-4" /> Remove photo
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPick}
            className="sr-only"
          />
          <input type="hidden" name="removeAvatar" value={removed ? "1" : "0"} />
        </div>

        <div className="space-y-5">
          <nav className="flex flex-wrap gap-6 border-b border-slate-200 text-sm font-semibold">
            <span className="-mb-px inline-flex items-center gap-2 border-b-2 border-blue-600 pb-3 text-blue-600">
              <User className="h-4 w-4" /> Personal Information
            </span>
            <Link
              href="/account/security"
              className={cn("inline-flex items-center gap-2 pb-3 text-slate-600 hover:text-blue-600")}
            >
              <Shield className="h-4 w-4" /> Security
            </Link>
          </nav>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className={lbl}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <span className="relative block">
                <UserCog className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="name"
                  name="name"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className={field}
                  required
                />
              </span>
            </div>
            <div>
              <label className={lbl}>Email Address</label>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={email} disabled className={field} />
              </span>
            </div>
            <div>
              <label className={lbl}>Role</label>
              <span className="relative block">
                <Shield className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={role || "-"} disabled className={field} />
              </span>
            </div>
          </div>

          {(clientError || state) && (
            <p
              role="status"
              className={cn(
                "rounded-lg px-4 py-3 text-sm font-medium",
                clientError || !state?.ok ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
              )}
            >
              {clientError || (state?.ok ? state.message : state?.error)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <button
          type="reset"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-navy-800 hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
          Save Changes
        </button>
      </div>
    </form>
  );
}