import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { materialService } from "@/services/material.service";
import { CategoryForm } from "./category-form";

export default async function MaterialCategoriesPage() {
  const categories = await materialService.listCategories();

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        title="Material categories"
        description="Group materials, for example Fabric, Trims, Packaging"
        actions={
          <Link href="/materials" className={buttonVariants({ variant: "outline" })}>
            Back to materials
          </Link>
        }
      />
      <CategoryForm />
      <Card>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Materials</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                  No categories yet
                </TableCell>
              </TableRow>
            ) : (
              categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c._count.materials}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}