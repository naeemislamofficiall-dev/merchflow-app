"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";

// three.js shudhu browser-e load hobe
const Scene = dynamic(() => import("./scene"), { ssr: false });

const field =
  "h-11 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm text-navy-800 shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-500/20";
const lbl = "mb-1.5 block text-sm font-semibold text-navy-800";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      otp: form.get("otp") ?? "",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Email, password or code is wrong");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{
        background:
          "radial-gradient(1200px 600px at 15% 10%, #dbeafe 0%, transparent 60%), radial-gradient(900px 600px at 90% 90%, #bfdbfe 0%, transparent 55%), linear-gradient(135deg, #f5f9ff 0%, #e8f0ff 100%)",
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Scene />
      </div>

      <form
        onSubmit={onSubmit}
          className="lg-form relative z-10 w-full max-w-sm space-y-4 rounded-2xl border border-white/70 bg-white/85 p-7 shadow-[0_30px_80px_-20px_rgba(37,99,235,0.35)] backdrop-blur-md"
      >
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide text-navy-800">
            MERCH<span className="text-gold-500">FLOW</span>
          </h1>
          <p className="text-sm text-slate-500">Sign in to continue</p>
        </div>

        <div>
          <label htmlFor="email" className={lbl}>
            Email
          </label>
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input id="email" name="email" type="email" required autoComplete="email" className={field} />
          </span>
        </div>

        <div>
          <label htmlFor="password" className={lbl}>
            Password
          </label>
          <span className="relative block">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={field}
            />
          </span>
        </div>

        <div>
          <label htmlFor="otp" className={lbl}>
            Authenticator or backup code (only if two-factor is on)
          </label>
          <span className="relative block">
            <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input id="otp" name="otp" maxLength={12} autoComplete="one-time-code" className={field} />
          </span>
        </div>

        <div className="text-right">
          <Link href="/forgot-password" className="text-xs font-semibold text-blue-600 hover:underline">
            Forgot password?
          </Link>
        </div>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-navy-800 text-sm font-semibold text-white shadow-md shadow-blue-900/25 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {loading ? "Please wait..." : "Login"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
    </main>
  );
}