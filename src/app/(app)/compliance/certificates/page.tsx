import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateForm, RowActions } from "@/components/crud/crud-kit";
import { can, requireUser } from "@/lib/permissions";
import { complianceService } from "@/services/compliance.service";
import { createCertificateAction, revokeCertificateAction } from "../actions";

const STATE_LABEL: Record<string, string> = {
  VALID: "Valid",
  EXPIRING: "Expiring soon",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};
const STATE_VARIANT = {
  VALID: "success",
  EXPIRING: "warning",
  EXPIRED: "danger",
  REVOKED: "muted",
} as const;
const day = (d: Date) => d.toISOString().slice(0, 10);

export default async function CertificatesPage() {
  const user = await requireUser();
  if (!can(user, "compliance.view")) redirect("/dashboard");

  const canManage = can(user, "compliance.manage");
  const [rows, opts] = await Promise.all([
    complianceService.listCertificates(),
    canManage ? complianceService.formOptions() : Promise.resolve(null),
  ]);
  const count = (s: string) => rows.filter((r) => r.state === s).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Certificates"
        description="Factory and compliance certificates. Expiring and expired ones also appear in Alerts"
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Valid", count("VALID")],
          ["Expiring soon", count("EXPIRING")],
          ["Expired", count("EXPIRED")],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Type</TableHead>
                <TableHead>Certificate no</TableHead>
                <TableHead>Issuer</TableHead>
                <TableHead>Factory</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>State</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                    No certificates yet
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.typeName}</TableCell>
                    <TableCell>{r.certificateNo}</TableCell>
                    <TableCell>{r.issuer}</TableCell>
                    <TableCell>{r.factory}</TableCell>
                    <TableCell>{day(r.issueDate)}</TableCell>
                    <TableCell>
                      {day(r.expiryDate)}
                      {r.state !== "REVOKED" && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({r.daysLeft < 0 ? `${-r.daysLeft}d ago` : `${r.daysLeft}d left`})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATE_VARIANT[r.state]}>{STATE_LABEL[r.state]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage && r.status === "ACTIVE" && (
                        <RowActions
                          id={r.id}
                          actions={[{ label: "Revoke", reason: "Why is this certificate being revoked?", action: revokeCertificateAction }]}
                        />
                      )}
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
          title="Add certificate"
          submitLabel="Add certificate"
          action={createCertificateAction}
          fields={[
            { name: "typeId", label: "Type", type: "select", required: true, options: opts.certTypes },
            { name: "certificateNo", label: "Certificate no", required: true },
            { name: "issuer", label: "Issuer", required: true },
            { name: "factoryId", label: "Factory", type: "select", options: opts.factories, emptyLabel: "All factories" },
            { name: "issueDate", label: "Issue date", type: "date", required: true },
            { name: "expiryDate", label: "Expiry date", type: "date", hint: "Empty uses the type's validity months" },
            { name: "remarks", label: "Remarks" },
          ]}
        />
      )}
    </div>
  );
}
