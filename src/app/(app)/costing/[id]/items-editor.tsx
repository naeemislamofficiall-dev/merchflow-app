"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addCostItemAction, removeCostItemAction, updateCostItemAction } from "../actions";
import { COST_CATEGORIES, categoryLabel, type CostCategoryName } from "../categories";

export type CostItemRow = {
  id: string;
  category: string;
  description: string;
  unit: string;
  consumption: string;
  unitPrice: string;
  wastagePct: string;
  amount: number;
};

type Draft = {
  category: CostCategoryName;
  description: string;
  unit: string;
  consumption: string;
  unitPrice: string;
  wastagePct: string;
};

type Parsed =
  | {
      ok: true;
      value: {
        category: CostCategoryName;
        description: string;
        unit?: string;
        consumption: number;
        unitPrice: number;
        wastagePct: number;
      };
    }
  | { ok: false; error: string };

const NUM = /^[0-9]+(\.[0-9]{1,4})?$/;
const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);

const emptyDraft: Draft = {
  category: "FABRIC",
  description: "",
  unit: "PCS",
  consumption: "1",
  unitPrice: "",
  wastagePct: "0",
};

function parse(d: Draft): Parsed {
  if (!d.description.trim()) return { ok: false, error: "Description is required" };
  if (d.unit.trim().length > 10) return { ok: false, error: "Unit can be at most 10 characters" };
  if (!NUM.test(d.consumption) || Number(d.consumption) <= 0) {
    return { ok: false, error: "Consumption must be a number above 0" };
  }
  if (!NUM.test(d.unitPrice)) return { ok: false, error: "Unit price must be a number like 4.25" };
  if (!NUM.test(d.wastagePct) || Number(d.wastagePct) > 100) {
    return { ok: false, error: "Wastage must be a number between 0 and 100" };
  }
  return {
    ok: true,
    value: {
      category: d.category,
      description: d.description.trim(),
      unit: d.unit.trim() || undefined,
      consumption: Number(d.consumption),
      unitPrice: Number(d.unitPrice),
      wastagePct: Number(d.wastagePct),
    },
  };
}

function DraftFields({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
}) {
  return (
    <>
      <TableCell>
        <Select
          value={draft.category}
          onChange={(e) => onChange({ ...draft, category: e.target.value as CostCategoryName })}
        >
          {COST_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </Select>
      </TableCell>
      <TableCell>
        <Input value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })} />
      </TableCell>
      <TableCell>
        <Input className="w-20" value={draft.unit} onChange={(e) => onChange({ ...draft, unit: e.target.value })} />
      </TableCell>
      <TableCell>
        <Input
          className="w-24"
          inputMode="decimal"
          value={draft.consumption}
          onChange={(e) => onChange({ ...draft, consumption: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Input
          className="w-24"
          inputMode="decimal"
          value={draft.unitPrice}
          onChange={(e) => onChange({ ...draft, unitPrice: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Input
          className="w-20"
          inputMode="decimal"
          value={draft.wastagePct}
          onChange={(e) => onChange({ ...draft, wastagePct: e.target.value })}
        />
      </TableCell>
    </>
  );
}

export function ItemsEditor({
  sheetId,
  editable,
  items,
}: {
  sheetId: string;
  editable: boolean;
  items: CostItemRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Draft>(emptyDraft);
  const [add, setAdd] = useState<Draft>(emptyDraft);

  function beginEdit(it: CostItemRow) {
    setError("");
    setEditingId(it.id);
    setEdit({
      category: it.category as CostCategoryName,
      description: it.description,
      unit: it.unit,
      consumption: it.consumption,
      unitPrice: it.unitPrice,
      wastagePct: it.wastagePct,
    });
  }

  function saveEdit(id: string) {
    const p = parse(edit);
    if (!p.ok) {
      setError(p.error);
      return;
    }
    setError("");
    start(async () => {
      const res = await updateCostItemAction(id, p.value);
      if (!res.ok) setError(res.error);
      else {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  function addItem() {
    const p = parse(add);
    if (!p.ok) {
      setError(p.error);
      return;
    }
    setError("");
    start(async () => {
      const res = await addCostItemAction(sheetId, p.value);
      if (!res.ok) setError(res.error);
      else {
        setAdd(emptyDraft);
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    if (!window.confirm("Remove this cost item?")) return;
    setError("");
    start(async () => {
      const res = await removeCostItemAction(id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Consumption</TableHead>
            <TableHead>Unit price</TableHead>
            <TableHead>Wastage %</TableHead>
            <TableHead>Amount</TableHead>
            {editable && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={editable ? 8 : 7} className="h-20 text-center text-muted-foreground">
                No cost items yet
              </TableCell>
            </TableRow>
          )}

          {items.map((it) =>
            editingId === it.id ? (
              <TableRow key={it.id}>
                <DraftFields draft={edit} onChange={setEdit} />
                <TableCell className="text-muted-foreground">-</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" disabled={pending} onClick={() => saveEdit(it.id)}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow key={it.id}>
                <TableCell>{categoryLabel(it.category)}</TableCell>
                <TableCell>{it.description}</TableCell>
                <TableCell>{it.unit}</TableCell>
                <TableCell>{fmt(Number(it.consumption))}</TableCell>
                <TableCell>{fmt(Number(it.unitPrice))}</TableCell>
                <TableCell>{fmt(Number(it.wastagePct))}</TableCell>
                <TableCell className="font-medium">{fmt(it.amount)}</TableCell>
                {editable && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => beginEdit(it)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(it.id)}>
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )
          )}

          {editable && (
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <DraftFields draft={add} onChange={setAdd} />
              <TableCell className="text-muted-foreground">-</TableCell>
              <TableCell>
                <Button size="sm" disabled={pending} onClick={addItem}>
                  Add item
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {error && <p className="px-4 pb-3 text-sm text-destructive">{error}</p>}
    </Card>
  );
}