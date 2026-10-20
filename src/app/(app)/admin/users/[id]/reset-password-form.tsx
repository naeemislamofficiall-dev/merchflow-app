"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { resetPasswordAction } from "../actions";

export function ResetPasswordForm({ id }: { id: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);
    start(async () => {
      const res = await resetPasswordAction(id, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPassword("");
      setDone(true);
    });
  }

  return (
    <form onSubmit={submit}>
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">Reset password</h2>
        <FormField label="New password" htmlFor="newPassword" hint="At least 8 characters, with a letter and a number">
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {done && <p className="text-sm text-emerald-700">Password updated.</p>}
        <Button type="submit" variant="outline" disabled={pending || password.length === 0}>
          {pending ? "Updating..." : "Set new password"}
        </Button>
      </Card>
    </form>
  );
}
