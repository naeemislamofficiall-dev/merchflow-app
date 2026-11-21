import Link from "next/link";
import { Building2, Factory, Layers, Shirt, Users } from "lucide-react";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { resolveScope } from "@/lib/scope";
import { cn } from "@/lib/utils";
import { organizationService } from "@/services/organization.service";
import { OrgForm } from "./org-forms";

const th = "whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold uppercase tracking-wide";
const td = "px-4 py-3.5 text-[15px] text-navy-800";

export default async function OrganizationPage(props: { searchParams: Promise<{ factoryId?: string }> }) {
  const sp = await props.searchParams;
  const user = await requirePermission("organization.view");
  const scope = await resolveScope(user.id);

  const factories = await prisma.factory.findMany({
    where: { id: { in: scope.factoryIds } },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
  const factory = factories.find((f) => f.id === sp.factoryId) ?? factories[0];

  if (!factory) {
    return (
      <div className="space-y-4">
        <PageHeader title="Organization" description="Factory structure" />
        <p className="text-sm text-muted-foreground">No factory is available for your account.</p>
      </div>
    );
  }

  const [buildings, departments, lines] = await Promise.all([
    organizationService.listBuildings(factory.id),
    prisma.department.findMany({
      where: { factoryId: factory.id },
      include: { floor: { select: { code: true } } },
      orderBy: { code: "asc" },
    }),
    prisma.line.findMany({
      where: { floor: { building: { factoryId: factory.id } } },
      include: {
        floor: { select: { code: true, building: { select: { code: true } } } },
        department: { select: { code: true } },
      },
      orderBy: { code: "asc" },
    }),
  ]);

  const floorOptions = buildings.flatMap((b) =>
    b.floors.map((f) => ({ id: f.id, label: `${b.code} / ${f.code} - ${f.name}` }))
  );
  const floorCount = buildings.reduce((s, b) => s + b.floors.length, 0);

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
            <Building2 className="h-8 w-8" strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Organization</h1>
            <p className="text-sm text-slate-500">Factory → building → floor → department → line</p>
          </div>
        </header>
      </PageBand>

      {factories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {factories.map((f) => (
            <Link
              key={f.id}
              href={`/organization?factoryId=${f.id}`}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors",
                f.id === factory.id
                  ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-900/20"
                  : "border-slate-200 bg-white text-navy-800 hover:bg-slate-50"
              )}
            >
              <Factory className="h-4 w-4" /> {f.code}
            </Link>
          ))}
        </div>
      )}

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatCard theme="blue" icon={Building2} label="Buildings" value={buildings.length} sub={`${factory.code} ${factory.name}`} />
        <StatCard theme="green" icon={Layers} label="Floors" value={floorCount} sub="Across all buildings" />
        <StatCard theme="violet" icon={Users} label="Departments" value={departments.length} sub="In this factory" />
        <StatCard theme="orange" icon={Shirt} label="Sewing Lines" value={lines.length} sub="In this factory" />
      </div>

      <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
        <div className="bg-navy-800 px-5 py-3.5 text-white">
          <h2 className="font-heading text-lg font-semibold">
            Buildings and Floors · {factory.code} {factory.name}
          </h2>
        </div>
        <div className="space-y-3 p-5">
          {buildings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No buildings yet</p>
          ) : (
            buildings.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-navy-800">
                  {b.code} · {b.name}
                </span>
                {b.floors.length === 0 ? (
                  <span className="text-muted-foreground">no floors</span>
                ) : (
                  b.floors.map((f) => (
                    <span key={f.id} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      {f.code} {f.name}
                    </span>
                  ))
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
          <div className="bg-navy-800 px-5 py-3.5 text-white">
            <h2 className="font-heading text-lg font-semibold">Departments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-navy-800">
                <tr>
                  <th className={th}>Code</th>
                  <th className={th}>Name</th>
                  <th className={th}>Floor</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr className="border-t border-slate-100">
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      None yet
                    </td>
                  </tr>
                ) : (
                  departments.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100">
                      <td className={`${td} font-semibold`}>{d.code}</td>
                      <td className={td}>{d.name}</td>
                      <td className={td}>{d.floor?.code ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
          <div className="bg-navy-800 px-5 py-3.5 text-white">
            <h2 className="font-heading text-lg font-semibold">Lines</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-navy-800">
                <tr>
                  <th className={th}>Code</th>
                  <th className={th}>Name</th>
                  <th className={th}>Floor</th>
                  <th className={th}>Dept</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr className="border-t border-slate-100">
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      None yet
                    </td>
                  </tr>
                ) : (
                  lines.map((l) => (
                    <tr key={l.id} className="border-t border-slate-100">
                      <td className={`${td} font-semibold`}>{l.code}</td>
                      <td className={td}>{l.name}</td>
                      <td className={td}>
                        {l.floor.building.code} / {l.floor.code}
                      </td>
                      <td className={td}>{l.department?.code ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <OrgForm kind="building" factoryId={factory.id} />
        <OrgForm
          kind="floor"
          factoryId={factory.id}
          buildings={buildings.map((b) => ({ id: b.id, label: `${b.code} - ${b.name}` }))}
        />
        <OrgForm kind="department" factoryId={factory.id} floors={floorOptions} />
        <OrgForm
          kind="line"
          factoryId={factory.id}
          floors={floorOptions}
          departments={departments.map((d) => ({ id: d.id, label: `${d.code} - ${d.name}` }))}
        />
      </div>
    </div>
  );
}