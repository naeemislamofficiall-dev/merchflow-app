import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { can, requireUser } from "@/lib/permissions";
import { documentService } from "@/services/document.service";
import { DeleteButton } from "./delete-button";
import { RegisterForm } from "./register-form";

type Doc = Awaited<ReturnType<typeof documentService.list>>[number];

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "-");

function ExpiryBadge({ date, now }: { date: Date | null; now: number }) {
  if (!date) return <span>-</span>;
  const left = Math.ceil((date.getTime() - now) / 86_400_000);
  if (left < 0) return <Badge variant="danger">expired {-left}d ago</Badge>;
  if (left <= 30) return <Badge variant="warning">{left} days left</Badge>;
  return <Badge variant="muted">{day(date)}</Badge>;
}

function DocTable({ docs, canDelete, empty, now }: { docs: Doc[]; canDelete: boolean; empty: string; now: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Name</TableHead>
          <TableHead>Kind</TableHead>
          <TableHead>Belongs to</TableHead>
          <TableHead>Ver.</TableHead>
          <TableHead>Access</TableHead>
          <TableHead>Expiry</TableHead>
          {canDelete && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {docs.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={canDelete ? 7 : 6} className="h-16 text-center text-muted-foreground">
              {empty}
            </TableCell>
          </TableRow>
        ) : (
          docs.map((d) => (
            <TableRow key={d.id}>
              <TableCell>
                {d.storageUrl ? (
                  <a href={d.storageUrl} target="_blank" rel="noreferrer" className="font-medium text-denim-700 hover:underline">
                    {d.fileName}
                  </a>
                ) : (
                  <span className="font-medium">{d.fileName}</span>
                )}
              </TableCell>
              <TableCell>{d.docType ?? "-"}</TableCell>
              <TableCell>
                {d.entityType}
                <span className="block max-w-40 truncate text-xs text-muted-foreground">{d.entityId}</span>
              </TableCell>
              <TableCell>v{d.version}</TableCell>
              <TableCell className="capitalize">{d.access.toLowerCase()}</TableCell>
              <TableCell>
                <ExpiryBadge date={d.expiryDate} now={now} />
              </TableCell>
              {canDelete && (
                <TableCell>
                  <DeleteButton id={d.id} />
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export default async function DocumentsPage(props: {
  searchParams: Promise<{ days?: string; entityType?: string; entityId?: string }>;
}) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const now = new Date().getTime();

  if (!can(user, "document.view")) {
    return <p className="text-sm text-muted-foreground">Your role cannot view documents.</p>;
  }

  const days = Math.min(365, Math.max(1, Number(sp.days) || 30));
  const expiring = await documentService.listExpiring(days);
  const type = sp.entityType?.trim();
  const eid = sp.entityId?.trim();
  const lookup = type && eid ? await documentService.list(type, eid) : null;
  const canDelete = can(user, "document.delete");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Documents"
        description="Certificates and contracts: what is about to expire, and everything filed against a record"
      />

      <Card>
        <CardHeader>
          <CardTitle>Expiring within {days} days</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-0">
          <form method="get" className="flex items-end gap-2 px-4 pt-1">
            <label className="text-xs text-muted-foreground">
              Days ahead
              <Input name="days" type="number" min={1} max={365} defaultValue={days} className="mt-1 w-28" />
            </label>
            <Button variant="outline">Update</Button>
          </form>
          <DocTable docs={expiring} canDelete={canDelete} empty="Nothing is expiring in this window" now={now} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Find documents of a record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-0">
          <form method="get" className="flex flex-wrap items-end gap-2 px-4 pt-1">
            <label className="text-xs text-muted-foreground">
              Belongs to
              <Input name="entityType" defaultValue={type ?? ""} placeholder="Supplier" className="mt-1" />
            </label>
            <label className="text-xs text-muted-foreground">
              Record id
              <Input name="entityId" defaultValue={eid ?? ""} className="mt-1" />
            </label>
            <Button variant="outline">Find</Button>
          </form>
          {lookup && <DocTable docs={lookup} canDelete={canDelete} empty="No documents for this record" now={now} />}
        </CardContent>
      </Card>

      {can(user, "document.upload") && <RegisterForm />}
    </div>
  );
}