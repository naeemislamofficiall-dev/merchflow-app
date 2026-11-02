import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { can, requireUser } from "@/lib/permissions";
import { importService } from "@/services/import.service";
import { ConfirmButton } from "../confirm-button";

const short = (v: unknown) => {
  const s = JSON.stringify(v);
  return s.length > 140 ? `${s.slice(0, 140)}...` : s;
};

export default async function ImportBatchPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!can(user, "import.run")) redirect("/dashboard");
  const { id } = await props.params;
  const { batch, errorRows, otherRows } = await importService.get(id);

  return (
    <div className="space-y-4">
      <PageHeader title={`Import: ${batch.type}`} description={`${batch.fileName} | ${batch.status}`} />
      <Link href="/import" className="text-sm underline">Back to imports</Link>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Total rows", batch.totalRows], ["Ready (OK)", batch.okRows], ["Errors", batch.errorRows], ["Skipped (already exist)", batch.skippedRows]].map(([k, v]) => (
          <div key={String(k)} className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="text-xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      {batch.status === "HAS_ERRORS" && (
        <p className="text-sm font-medium text-red-600">
          {batch.errorRows} row(s) have errors. Nothing is imported. Fix the file and upload it again.
        </p>
      )}
      {batch.status === "VALIDATED" && batch.okRows > 0 && <ConfirmButton id={batch.id} count={batch.okRows} />}
      {batch.status === "VALIDATED" && batch.okRows === 0 && (
        <p className="text-sm text-muted-foreground">Nothing new to import. All rows already exist.</p>
      )}
      {batch.status === "IMPORTED" && <p className="text-sm font-medium text-green-700">Imported. Audit log entry written.</p>}
      {batch.status === "FAILED" && <p className="text-sm font-medium text-red-600">Import failed and nothing was saved: {batch.failReason}</p>}

      <h2 className="text-sm font-semibold">Rows</h2>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Row</TableHead><TableHead>Status</TableHead><TableHead>Message</TableHead><TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...errorRows, ...otherRows].map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.rowNo}</TableCell>
                  <TableCell className={r.status === "ERROR" ? "font-medium text-red-600" : ""}>{r.status}</TableCell>
                  <TableCell className="max-w-sm">{r.errors.join("; ") || "-"}</TableCell>
                  <TableCell className="max-w-md truncate text-xs text-muted-foreground">{short(r.data)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Errors first (max 200), then up to 100 other rows.</p>
    </div>
  );
}