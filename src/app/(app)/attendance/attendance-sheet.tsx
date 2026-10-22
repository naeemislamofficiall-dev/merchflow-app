"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveAttendanceAction } from "./actions";

export type SheetRow = {
  employeeId: string;
  employeeNo: string;
  fullName: string;
  status: string;
  overtimeHours: string;
};

const STATUSES = [
  ["PRESENT", "Present"],
  ["ABSENT", "Absent"],
  ["LATE", "Late"],
  ["HALF_DAY", "Half day"],
  ["LEAVE", "Leave"],
  ["HOLIDAY", "Holiday"],
  ["WEEKEND", "Weekend"],
];

export function AttendanceSheet({
  factoryId,
  date,
  rows,
  canRecord,
}: {
  factoryId: string;
  date: string;
  rows: SheetRow[];
  canRecord: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, { status: string; overtimeHours: string }>>(
    Object.fromEntries(rows.map((r) => [r.employeeId, { status: r.status, overtimeHours: r.overtimeHours }]))
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, start] = useTransition();

  function set(id: string, patch: Partial<{ status: string; overtimeHours: string }>) {
    setSaved("");
    setState((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  }

  function markAllPresent() {
    setSaved("");
    setState((s) =>
      Object.fromEntries(
        Object.entries(s).map(([id, v]) => [id, v.status === "" ? { ...v, status: "PRESENT" } : v])
      )
    );
  }

  function save() {
    setError("");
    setSaved("");
    start(async () => {
      const res = await saveAttendanceAction(
        factoryId,
        date,
        rows.map((r) => ({
          employeeId: r.employeeId,
          status: state[r.employeeId]?.status ?? "",
          overtimeHours: state[r.employeeId]?.overtimeHours ?? "",
        }))
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(`Saved ${res.data.saved} record(s)`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {canRecord && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={markAllPresent} disabled={pending}>
            Mark all unmarked as present
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving..." : "Save attendance"}
          </Button>
        </div>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-48">Status</TableHead>
                <TableHead className="w-36 text-right">Overtime (hours)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    No active employees for this factory on this date
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.employeeId}>
                    <TableCell className="font-medium">{r.employeeNo}</TableCell>
                    <TableCell>{r.fullName}</TableCell>
                    <TableCell>
                      <Select
                        disabled={!canRecord}
                        value={state[r.employeeId]?.status ?? ""}
                        onChange={(e) => set(r.employeeId, { status: e.target.value })}
                      >
                        <option value="">Not marked</option>
                        {STATUSES.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        max="16"
                        className="text-right"
                        disabled={!canRecord}
                        value={state[r.employeeId]?.overtimeHours ?? ""}
                        onChange={(e) => set(r.employeeId, { overtimeHours: e.target.value })}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-emerald-700">{saved}</p>}
    </div>
  );
}
