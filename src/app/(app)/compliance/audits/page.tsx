import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateForm } from "@/components/crud/crud-kit";
import { can, requireUser } from "@/lib/permissions";
import { complianceService } from "@/services/compliance.service";
import { createAuditAction } from "../actions";

export default async function AuditsPage() {
  const user = await requireUser();
  if (!can(user, "compliance.view")) redirect("/dashboard");

  const canManage = can(user, "compliance.manage");
  const [rows, opts] = await Promise.all([
    complianceService.listAudits(),
    canManage ? complianceService.formOptions() : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="Compliance audits" description="Buyer, social, factory, environmental and safety audits" />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Audit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Auditor</TableHead>
                <TableHead>Factory</TableHead>
                <TableHead>Planned</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                    No audits yet
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={`/compliance/audits/${r.id}`} className="text-primary hover:underline">
                        {r.auditNo}
                      </Link>
                    </TableCell>
                    <TableCell>{r.typeName}</TableCell>
                    <TableCell>{r.auditorName}</TableCell>
                    <TableCell>{r.factory}</TableCell>
                    <TableCell>{r.plannedDate.toISOString().slice(0, 10)}</TableCell>
                    <TableCell>{r.result ? r.result.toLowerCase() : "-"}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {canManage && opts && (
        <CreateForm
          title="Schedule an audit"
          submitLabel="Schedule audit"
          action={createAuditAction}
          fields={[
            { name: "typeId", label: "Audit type", type: "select", required: true, options: opts.auditTypes },
            { name: "auditorName", label: "Auditor / buyer", required: true },
            { name: "factoryId", label: "Factory", type: "select", options: opts.factories, emptyLabel: "All factories" },
            { name: "plannedDate", label: "Planned date", type: "date", required: true },
          ]}
        />
      )}
    </div>
  );
}
