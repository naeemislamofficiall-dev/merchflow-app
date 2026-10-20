import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { qualityService } from "@/services/quality.service";
import { DefectForm } from "./defect-form";

export default async function DefectsPage() {
  const defects = await qualityService.listDefects(true);

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="Defects" description="The defect list inspectors choose from" />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defects.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    No defects yet. Add the common ones before you record an inspection.
                  </TableCell>
                </TableRow>
              ) : (
                defects.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.code}</TableCell>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>{d.category ?? "-"}</TableCell>
                    <TableCell className="capitalize">{d.severity.toLowerCase()}</TableCell>
                    <TableCell>{d.isActive ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <DefectForm />
    </div>
  );
}