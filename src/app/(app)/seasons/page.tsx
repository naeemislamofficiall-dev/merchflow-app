import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { can, requireUser } from "@/lib/permissions";
import { seasonService } from "@/services/season.service";

export default async function SeasonsPage() {
  const user = await requireUser();
  if (!can(user, "season.view")) redirect("/dashboard");
  const seasons = await seasonService.list();
  const canCreate = can(user, "season.create");
  const canEdit = can(user, "season.edit");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Seasons"
        description="Season master used by styles and orders"
        actions={canCreate ? <Link href="/seasons/new" className={buttonVariants()}>New season</Link> : undefined}
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Styles</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {seasons.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">No seasons yet</TableCell>
                </TableRow>
              ) : (
                seasons.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.code}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell className="text-right">{s._count.styles}</TableCell>
                    <TableCell className="text-right">{s._count.orders}</TableCell>
                    <TableCell>
                      {canEdit && <Link href={`/seasons/${s.id}`} className="text-denim-700 hover:underline">Edit</Link>}
                    </TableCell>
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