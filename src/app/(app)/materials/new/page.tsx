import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { materialService } from "@/services/material.service";
import { MaterialForm } from "../material-form";

export default async function NewMaterialPage() {
  const categories = await materialService.listCategories();
  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="New material" description="Add a material to your catalogue" />
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Create a category first.{" "}
          <Link href="/materials/categories" className="text-denim-700 hover:underline">
            Go to categories
          </Link>
        </p>
      ) : (
        <MaterialForm categories={categories.map((c) => ({ id: c.id, label: `${c.code} - ${c.name}` }))} />
      )}
    </div>
  );
}