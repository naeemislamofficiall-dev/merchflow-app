"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction } from "./actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      await requestPasswordResetAction(email);
      setSent(true);
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-denim-800 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-card p-6 shadow-xl">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-wide text-denim-800">
            MERCH<span className="text-gold-500">FLOW</span>
          </h1>
          <p className="text-sm text-muted-foreground">Reset your password</p>
        </div>
        {sent ? (
          <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
            If this email belongs to an account, your administrator has been notified and will send you a reset link.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button disabled={pending} className="w-full">
              {pending ? "Please wait..." : "Request reset"}
            </Button>
          </form>
        )}
        <Link href="/login" className="block text-center text-sm text-denim-700 hover:underline">
          Back to login
        </Link>
      </div>
    </main>
  );
}
