import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { resolveScope } from "@/lib/scope";
import { organizationService } from "@/services/organization.service";
import { OrgForm } from "./org-forms";

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

  return (
    <div className="space-y-4">
      <PageHeader title="Organization" description="Factory → building → floor → department → line" />

      {factories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {factories.map((f) => (
            <Link
              key={f.id}
              href={`/organization?factoryId=${f.id}`}
              className={buttonVariants({ variant: f.id === factory.id ? "default" : "outline", size: "sm" })}
            >
              {f.code}
            </Link>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Buildings and floors · {factory.code} {factory.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {buildings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No buildings yet</p>
          ) : (
            buildings.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">
                  {b.code} · {b.name}
                </span>
                {b.floors.length === 0 ? (
                  <span className="text-muted-foreground">no floors</span>
                ) : (
                  b.floors.map((f) => (
                    <Badge key={f.id} variant="info">
                      {f.code} {f.name}
                    </Badge>
                  ))
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Floor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                      None yet
                    </TableCell>
                  </TableRow>
                ) : (
                  departments.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.code}</TableCell>
                      <TableCell>{d.name}</TableCell>
                      <TableCell>{d.floor?.code ?? "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lines</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Dept</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                      None yet
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.code}</TableCell>
                      <TableCell>{l.name}</TableCell>
                      <TableCell>
                        {l.floor.building.code} / {l.floor.code}
                      </TableCell>
                      <TableCell>{l.department?.code ?? "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <OrgForm kind="building" factoryId={factory.id} />
        <OrgForm kind="floor" factoryId={factory.id} buildings={buildings.map((b) => ({ id: b.id, label: `${b.code} - ${b.name}` }))} />
        <OrgForm kind="department" factoryId={factory.id} floors={floorOptions} />
        <OrgForm kind="line" factoryId={factory.id} floors={floorOptions} departments={departments.map((d) => ({ id: d.id, label: `${d.code} - ${d.name}` }))} />
      </div>
    </div>
  );
}