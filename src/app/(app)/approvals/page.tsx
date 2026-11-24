import { Fragment } from "react";
import Link from "next/link";
import { AlarmClock, ArrowRight, ClipboardCheck, Clock, Eye, Send, ShieldCheck, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/detail/status-badge";
import { Avatar } from "@/components/layout/avatar";
import { EmptyState, Panel } from "@/components/dashboard/widgets";
import { RevealObserver } from "@/components/dashboard/reveal-observer";
import { Hero, StatCard, TypeChip, humanize } from "@/components/approvals/ui";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/permissions";
import { delegationCovers } from "@/lib/approval-calc";
import { approvalService } from "@/services/approval.service";
import { ApprovalButtons } from "./approval-buttons";
import { DelegationPanel } from "./delegation-panel";
import { RuleToggle } from "./rule-toggle";

const ENTITY_HREF: Record<string, (id: string) => string> = {
  PurchaseOrder: (id) => `/purchase-orders/${id}`,
  PurchaseRequisition: (id) => `/prs/${id}`,
  CostSheet: (id) => `/costing/${id}`,
  Shipment: (id) => `/shipments/${id}`,
  SampleRequest: (id) => `/samples/${id}`,
};

const TZ = "Asia/Dhaka";
const day = (d: Date) => d.toISOString().slice(0, 10);
const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const dateFmt = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: TZ });
const timeFmt = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const money = (n: unknown) =>
  n === null || n === undefined
    ? "-"
    : new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));
const whole = (n: unknown) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(n));

const TH = "px-3 py-2.5 text-left text-xs font-semibold text-slate-600";

export default async function ApprovalsPage() {
  const user = await requireUser();
  const canDecide = can(user, "approval.decide");
  const canRequest = can(user, "approval.request");
  const canManage = can(user, "approval.manage");
  const now = new Date();

  const pending = canDecide ? await approvalService.listPending() : null;
  const mine = canRequest ? await approvalService.listMine() : null;
  const workflows = canManage ? await approvalService.listWorkflows() : null;
  const roles = canManage
    ? await prisma.role.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];
  const delegation = canDecide ? await approvalService.listDelegations() : null;
  const delegateUsers = canDecide
    ? await prisma.user.findMany({
        where: { companyId: user.companyId, status: "ACTIVE", id: { not: user.id } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : [];

  const mapDel = (
    list: { id: string; startDate: Date; endDate: Date; reason: string; isActive: boolean }[],
    who: (i: number) => string
  ) =>
    list.map((d, i) => ({
      id: d.id,
      who: who(i),
      start: day(d.startDate),
      end: day(d.endDate),
      reason: d.reason,
      active: d.isActive,
    }));

  const requesterIds = pending ? [...new Set(pending.map((r) => r.requestedById))] : [];
  const requesters = requesterIds.length
    ? await prisma.user.findMany({
        where: { id: { in: requesterIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "-";

  const titleCell = (type: string, id: string, title: string) => {
    const href = ENTITY_HREF[type]?.(id);
    return href ? (
      <Link href={href} className="font-semibold text-navy-800 hover:text-blue-600 hover:underline">
        {title}
      </Link>
    ) : (
      <span className="font-semibold text-navy-800">{title}</span>
    );
  };

  // stat card-er real number
  const pendingCount = pending?.length ?? 0;
  const mineCount = mine?.length ?? 0;
  const minePending = mine?.filter((r) => r.status === "PENDING").length ?? 0;
  const givenActive = delegation?.given.filter((d) => delegationCovers(d, now)).length ?? 0;
  const receivedActive = delegation?.received.filter((d) => delegationCovers(d, now)).length ?? 0;
  const activeRules = workflows?.filter((w) => w.isActive).length ?? 0;

  const nothing = !canDecide && !canRequest && !canManage;

  return (
    <div data-reveal-root className="space-y-5">
      <RevealObserver />
      <Hero
        icon={ShieldCheck}
        title="Approvals"
        subtitle="Manage approval workflows and keep track of pending requests"
      />

      {nothing && <p className="text-sm text-muted-foreground">Your role has no approval permissions.</p>}

      {/* ---------- Stat cards ---------- */}
      {!nothing && (
        <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
          {pending && (
            <StatCard theme="blue" icon={Clock} label="Pending Approvals" value={pendingCount} sub="Need your decision" />
          )}
          {mine && (
            <StatCard theme="green" icon={Send} label="My Requests" value={mineCount} sub={`${minePending} still pending`} />
          )}
          {delegation && (
            <StatCard
              theme="violet"
              icon={Users}
              label="Delegated"
              value={givenActive}
              sub={`${receivedActive} delegated to you`}
            />
          )}
          {workflows && (
            <StatCard
              theme="orange"
              icon={ShieldCheck}
              label="Active Rules"
              value={activeRules}
              sub={`${workflows.length} rule(s) in total`}
            />
          )}
        </div>
      )}

      {/* ---------- Waiting for me ---------- */}
      {pending && (
        <Panel
          icon={ClipboardCheck}
          iconClass="bg-blue-100 text-blue-600"
          title="Waiting for me"
          subtitle="Requests that need your decision"
          aside={
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {pendingCount}
            </span>
          }
        >
          {pending.length === 0 ? (
            <EmptyState>Nothing waiting for you</EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <table className="w-full min-w-860px text-sm">
                <thead>
                  <tr className="bg-blue-50/70">
                    <th className={`${TH} rounded-l-lg`}>ID</th>
                    <th className={TH}>Type</th>
                    <th className={TH}>Request details</th>
                    <th className={`${TH} text-right`}>Amount</th>
                    <th className={TH}>Requested by</th>
                    <th className={TH}>Date</th>
                    <th className={`${TH} rounded-r-lg text-right`}>Action</th>
                  </tr>
                </thead>
                <tbody className="stagger stagger-fast">
                  {pending.map((r) => {
                    const who = requesters.find((u) => u.id === r.requestedById);
                    const whoName = who?.name ?? who?.email ?? "-";
                    const step = r.workflow?.steps.find((s) => s.stepOrder === r.currentStep);
                    return (
                      <tr key={r.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-3 text-slate-500">#{r.id.slice(-6).toUpperCase()}</td>
                        <td className="px-3 py-3">
                          <TypeChip type={r.entityType} />
                        </td>
                        <td className="px-3 py-3">
                          {titleCell(r.entityType, r.entityId, r.title)}
                          {step && <p className="text-[11px] text-slate-500">Step: {step.name}</p>}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-navy-800">{money(r.amount)}</td>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-2">
                            <Avatar name={whoName} className="h-7 w-7 text-[10px]" />
                            {whoName}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                          {dateFmt(r.requestedAt)} <span className="text-slate-400">•</span> {timeFmt(r.requestedAt)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link
                            href={`/approvals/${r.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                          >
                            <Eye className="h-4 w-4" />
                            Review
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* ---------- My requests ---------- */}
      {mine && (
        <Panel
          icon={Send}
          iconClass="bg-emerald-100 text-emerald-600"
          title="My requests"
          subtitle="Requests you have sent for approval"
        >
          {mine.length === 0 ? (
            <EmptyState>You have not sent any request</EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <table className="w-full min-w-720px text-sm">
                <thead>
                  <tr className="bg-blue-50/70">
                    <th className={`${TH} rounded-l-lg`}>Request</th>
                    <th className={TH}>Type</th>
                    <th className={`${TH} text-right`}>Amount</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Date</th>
                    <th className={`${TH} rounded-r-lg`} />
                  </tr>
                </thead>
                <tbody className="stagger stagger-fast">
                  {mine.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-3">{titleCell(r.entityType, r.entityId, r.title)}</td>
                      <td className="px-3 py-3">
                        <TypeChip type={r.entityType} />
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-navy-800">{money(r.amount)}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{dateFmt(r.requestedAt)}</td>
                      <td className="px-3 py-3">{r.status === "PENDING" && <ApprovalButtons id={r.id} mode="cancel" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* ---------- Delegation + Escalation ---------- */}
      {(delegation || canManage) && (
        <div className={cn("stagger grid gap-4", delegation && canManage && "lg:grid-cols-[1fr_22rem]")}>
          {delegation && (
            <DelegationPanel
              users={delegateUsers.map((u) => ({ id: u.id, label: `${u.name} (${u.email})` }))}
              given={mapDel(delegation.given, (i) => delegation.given[i].toUser.name)}
              received={mapDel(delegation.received, (i) => delegation.received[i].fromUser.name)}
              defaultStart={ymd(now)}
              defaultEnd={ymd(new Date(now.getTime() + 7 * 86_400_000))}
            />
          )}

          {canManage && (
            <section className="relative flex flex-col justify-between overflow-hidden rounded-card border bg-linear-to-br from-indigo-50 via-blue-50 to-white p-5 shadow-card">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <Zap className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-heading text-base font-semibold">Escalation</h2>
                  <p className="text-xs text-slate-500">Set up escalation rules for pending approvals</p>
                </div>
              </div>
              <div className="mt-6 flex items-end justify-between gap-3">
                <Link
                  href="/approvals/rules#escalation"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
                >
                  Configure Rules <ArrowRight className="h-4 w-4" />
                </Link>
                <AlarmClock className="h-20 w-20 shrink-0 text-indigo-400/70" strokeWidth={1.5} />
              </div>
            </section>
          )}
        </div>
      )}

      {/* ---------- Approval rules ---------- */}
      {workflows && (
        <Panel
          icon={ShieldCheck}
          iconClass="bg-blue-100 text-blue-600"
          title="Approval rules"
          subtitle="Manage your approval workflows and rules"
          aside={
            <div className="flex shrink-0 items-center gap-3">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {activeRules} Active
              </span>
              <Link
                href="/approvals/rules"
                className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3.5 py-2 text-sm font-semibold text-navy-800 transition-colors hover:bg-slate-50"
              >
                Manage Rules <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          }
        >
          {workflows.length === 0 ? (
            <EmptyState>
              No rules yet. Records are approved without a workflow
              <Link href="/approvals/rules" className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
                Add first rule
              </Link>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <table className="w-full min-w-760px text-sm">
                <thead>
                  <tr className="bg-blue-50/70">
                    <th className={`${TH} rounded-l-lg`}>Code</th>
                    <th className={TH}>Name</th>
                    <th className={TH}>Applies to</th>
                    <th className={TH}>Amount range</th>
                    <th className={TH}>Steps</th>
                    <th className={`${TH} rounded-r-lg`}>Active</th>
                  </tr>
                </thead>
                <tbody className="stagger stagger-fast">
                  {workflows.map((w) => (
                    <tr key={w.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-3 font-medium text-slate-600">{w.code}</td>
                      <td className="px-3 py-3 font-semibold text-navy-800">{w.name}</td>
                      <td className="px-3 py-3">{humanize(w.entityType)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                        {w.minAmount === null ? "0" : whole(w.minAmount)} – {w.maxAmount === null ? "No limit" : whole(w.maxAmount)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          {w.steps.map((s, i) => (
                            <Fragment key={s.id}>
                              {i > 0 && <ArrowRight className="h-3 w-3 text-slate-400" />}
                              <span
                                title={`${s.name} (${roleName(s.approverRoleId)})`}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
                              >
                                {s.stepOrder}
                              </span>
                            </Fragment>
                          ))}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <RuleToggle key={`${w.id}-${w.isActive}`} id={w.id} active={w.isActive} name={w.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}