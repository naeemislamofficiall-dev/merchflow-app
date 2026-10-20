import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { getBaseCurrency } from "@/services/currency.service";
import { RateForm } from "./rate-form";

export default async function CurrencyPage() {
  const user = await requirePermission("costing.view");
  const [currencies, base, rates] = await Promise.all([
    prisma.currency.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    getBaseCurrency(user.companyId),
    prisma.exchangeRate.findMany({ orderBy: [{ rateDate: "desc" }, { fromCode: "asc" }], take: 60 }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Currency & exchange rates"
        description={`Base currency: ${base}. One unit of the first currency equals the rate in the second`}
      />

      <RateForm currencies={currencies.map((c) => c.code)} base={base} />

      <Card>
        <CardHeader>
          <CardTitle>Latest 60 rates</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    No rates yet. Add the first one above
                  </TableCell>
                </TableRow>
              ) : (
                rates.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.rateDate.toISOString().slice(0, 10)}</TableCell>
                    <TableCell className="font-medium">{r.fromCode}</TableCell>
                    <TableCell className="font-medium">{r.toCode}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(Number(r.rate))}
                    </TableCell>
                    <TableCell className="capitalize">{r.source.toLowerCase()}</TableCell>
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