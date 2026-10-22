import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateForm, RowActions } from "@/components/crud/crud-kit";
import { can, requireUser } from "@/lib/permissions";
import { complianceService } from "@/services/compliance.service";
import {
  createAuditTypeAction,
  createCertificateTypeAction,
  toggleAuditTypeAction,
  toggleCertificateTypeAction,
} from "../actions";

export default async function ComplianceSettingsPage() {
  const user = await requireUser();
  if (!can(user, "compliance.view")) redirect("/dashboard");
  const canManage = can(user, "compliance.manage");

  const [certTypes, auditTypes] = await Promise.all([
    complianceService.listCertificateTypes(),
    complianceService.listAuditTypes(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Compliance settings" description="Certificate types and audit types you can use in your company" />

      <Card>
        <CardHeader>
          <CardTitle>Certificate types</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Validity (months)</TableHead>
                <TableHead className="text-right">Alert before (days)</TableHead>
                <TableHead>Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {certTypes.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                    No certificate types yet
                  </TableCell>
                </TableRow>
              ) : (
                certTypes.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.code}</TableCell>
                    <TableCell>{t.name}</TableCell>
                    <TableCell className="text-right">{t.validityMonths ?? "-"}</TableCell>
                    <TableCell className="text-right">{t.alertDays}</TableCell>
                    <TableCell>{t.isActive ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <RowActions id={t.id} actions={[{ label: t.isActive ? "Deactivate" : "Activate", action: toggleCertificateTypeAction }]} />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {canManage && (
        <CreateForm
          title="Add certificate type"
          action={createCertificateTypeAction}
          fields={[
            { name: "code", label: "Code", required: true, hint: "Example: WRAP, BSCI" },
            { name: "name", label: "Name", required: true },
            { name: "validityMonths", label: "Validity (months)", type: "number" },
            { name: "alertDays", label: "Alert before expiry (days)", type: "number", defaultValue: "60" },
          ]}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Audit types</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditTypes.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                    No audit types yet
                  </TableCell>
                </TableRow>
              ) : (
                auditTypes.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.code}</TableCell>
                    <TableCell>{t.name}</TableCell>
                    <TableCell>{t.isActive ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <RowActions id={t.id} actions={[{ label: t.isActive ? "Deactivate" : "Activate", action: toggleAuditTypeAction }]} />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {canManage && (
        <CreateForm
          title="Add audit type"
          columns={2}
          action={createAuditTypeAction}
          fields={[
            { name: "code", label: "Code", required: true, hint: "Example: BUYER, SOCIAL" },
            { name: "name", label: "Name", required: true },
          ]}
        />
      )}
    </div>
  );
}
