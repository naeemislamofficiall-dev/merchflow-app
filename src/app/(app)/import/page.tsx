import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IMPORTERS } from "@/lib/import-schemas";
import { can, requireUser } from "@/lib/permissions";
import { importService } from "@/services/import.service";
import { UploadForm } from "./upload-form";

const fmt = (d: Date | null) => (d ? `${d.toISOString().slice(0, 16).replace("T", " ")} UTC` : "-");

export default async function ImportPage() {
  const user = await requireUser();
  if (!can(user, "import.run")) redirect("/dashboard");
  const batches = await importService.listBatches();
  const types = Object.entries(IMPORTERS).map(([key, v]) => ({ key, label: v.label }));

  return (
    <div className="space-y-4">
      <PageHeader title="Data import" description="Upload, validate, preview errors, confirm. Nothing is imported until you confirm." />
      <UploadForm types={types} />
      <h2 className="text-sm font-semibold">Recent batches</h2>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Type</TableHead><TableHead>File</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Rows</TableHead><TableHead className="text-right">OK</TableHead>
                <TableHead className="text-right">Errors</TableHead><TableHead className="text-right">Skipped</TableHead>
                <TableHead>Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">No imports yet</TableCell>
                </TableRow>
              ) : (
                batches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.type}</TableCell>
                    <TableCell><Link className="underline" href={`/import/${b.id}`}>{b.fileName}</Link></TableCell>
                    <TableCell>{b.status}</TableCell>
                    <TableCell className="text-right">{b.totalRows}</TableCell>
                    <TableCell className="text-right">{b.okRows}</TableCell>
                    <TableCell className="text-right">{b.errorRows}</TableCell>
                    <TableCell className="text-right">{b.skippedRows}</TableCell>
                    <TableCell>{fmt(b.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}