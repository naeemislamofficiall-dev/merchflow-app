import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/permissions";
import { approvalService } from "@/services/approval.service";
import { RuleForm } from "./rule-form";
import { EscalationSettings } from "./escalation-settings";

export default async function ApprovalRulesPage() {
  const user = await requireUser();
  if (!can(user, "approval.manage")) {
    return <p className="text-sm text-muted-foreground">You do not have permission to manage approval rules.</p>;
  }

  const [roles, workflows] = await Promise.all([
    prisma.role.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    approvalService.listWorkflows(),
  ]);

  return (
    <div className="stagger space-y-5">
      <Link
        href="/approvals"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to approvals
      </Link>
      <RuleForm roles={roles} />
      <EscalationSettings
        rules={workflows.map((w) => ({ id: w.id, code: w.code, name: w.name, days: w.escalateAfterDays }))}
      />
    </div>
  );
}