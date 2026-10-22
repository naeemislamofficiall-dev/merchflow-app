import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/detail/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreateForm, RowActions } from "@/components/crud/crud-kit";
import { dropEmpty, runAction } from "@/lib/action-result";
import { BusinessRuleError } from "@/lib/business-rules";
import { can, requireUser } from "@/lib/permissions";
import { complianceService } from "@/services/compliance.service";
import { cancelAuditAction } from "../../actions";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "-");

export default async function AuditDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await requireUser();

  const a = await complianceService.getAudit(id).catch((e) => {
    if (e instanceof BusinessRuleError) return null;
    throw e;
  });
  if (!a) notFound();

  // এই অডিটের জন্য আলাদা Server Action (id বন্ধ করা আছে)
  async function completeAction(values: Record<string, string>) {
    "use server";
    return runAction(async () => {
      await complianceService.completeAudit(id, dropEmpty(values));
      return { id };
    });
  }

  const canManage = can(user, "compliance.manage") && a.status === "PLANNED";

  return (
    <div className="space-y-4">
      <PageHeader
        title={a.auditNo}
        description={`${a.type.name} · ${a.auditorName}`}
        actions={
          <>
            <StatusBadge status={a.status} />
            <Link href="/compliance/audits" className="text-sm text-primary hover:underline">
              All audits
            </Link>
          </>
        }
      />
      <Card>
        <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Planned date</p>
            {day(a.plannedDate)}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Completed</p>
            {day(a.completedDate)}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Result</p>
            {a.result ? a.result.toLowerCase() : "-"}
            {a.score !== null && ` (${Number(a.score)})`}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Next audit</p>
            {day(a.nextAuditDate)}
          </div>
          {a.findings && (
            <div className="md:col-span-4">
              <p className="text-xs text-muted-foreground">Findings</p>
              {a.findings}
            </div>
          )}
          {a.cancelReason && (
            <div className="md:col-span-4">
              <p className="text-xs text-muted-foreground">Cancelled because</p>
              {a.cancelReason}
            </div>
          )}
        </CardContent>
      </Card>
      {canManage && (
        <>
          <CreateForm
            title="Record the result"
            submitLabel="Complete audit"
            action={completeAction}
            fields={[
              {
                name: "result",
                label: "Result",
                type: "select",
                required: true,
                options: [
                  { value: "PASS", label: "Pass" },
                  { value: "CONDITIONAL", label: "Conditional" },
                  { value: "FAIL", label: "Fail" },
                ],
              },
              { name: "score", label: "Score (0-100)", type: "number" },
              { name: "completedDate", label: "Completed on", type: "date", hint: "Empty means today" },
              { name: "nextAuditDate", label: "Next audit date", type: "date" },
              { name: "findings", label: "Findings" },
            ]}
          />
          <RowActions
            id={a.id}
            actions={[{ label: "Cancel audit", reason: "Why is this audit being cancelled?", action: cancelAuditAction }]}
          />
        </>
      )}
    </div>
  );
}
