"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { createRoleAction, updateRoleAction } from "./actions";

type Group = { module: string; keys: string[] };

export function RoleForm({
  id,
  initial,
  groups,
  grantable,
  readOnly,
}: {
  id?: string;
  initial?: { name: string; description: string; keys: string[] };
  groups: Group[];
  grantable: string[]; // এই ইউজার যে permission-গুলো দিতে পারে ("*" থাকলে সব)
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.keys ?? []));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const all = grantable.includes("*");
  const canTouch = (k: string) => !readOnly && (all || grantable.includes(k));

  function toggle(k: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleModule(keys: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (!canTouch(k)) continue;
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    start(async () => {
      const values = { name, description, permissionKeys: [...selected] };
      const res = id ? await updateRoleAction(id, values) : await createRoleAction(values);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (id) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/admin/roles/${res.data.id}`);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Role name" htmlFor="roleName" required>
            <Input id="roleName" value={name} readOnly={readOnly} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Description" htmlFor="roleDesc">
            <Input id="roleDesc" value={description} readOnly={readOnly} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => {
          const allOn = g.keys.every((k) => selected.has(k));
          return (
            <Card key={g.module} className="space-y-2 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold capitalize">{g.module}</h3>
                {!readOnly && (
                  <button
                    type="button"
                    className="text-xs text-denim-700 hover:underline"
                    onClick={() => toggleModule(g.keys, !allOn)}
                  >
                    {allOn ? "Clear" : "Select all"}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {g.keys.map((k) => (
                  <label
                    key={k}
                    className={`flex items-center gap-1.5 text-sm ${canTouch(k) ? "" : "opacity-50"}`}
                    title={canTouch(k) ? undefined : "You do not have this permission yourself"}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(k)}
                      disabled={!canTouch(k)}
                      onChange={() => toggle(k)}
                    />
                    {k.slice(g.module.length + 1).replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-emerald-700">Saved.</p>}
      {!readOnly && (
        <Button type="submit" disabled={pending || name.trim().length < 2}>
          {pending ? "Saving..." : id ? "Save role" : "Create role"}
        </Button>
      )}
    </form>
  );
}
