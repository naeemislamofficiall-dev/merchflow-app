import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { PageHeader } from "@/components/layout/page-header";
import { materialService } from "@/services/material.service";
import { MaterialForm } from "../../material-form";

export default async function EditMaterialPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const material = await materialService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  const categories = await materialService.listCategories();

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title={`Edit ${material.code}`} description={material.name} />
      <MaterialForm
        id={id}
        categories={categories.map((c) => ({ id: c.id, label: `${c.code} - ${c.name}` }))}
        initial={{
          categoryId: material.categoryId,
          code: material.code,
          name: material.name,
          unit: material.unit,
          reorderPoint: material.reorderPoint ? String(material.reorderPoint) : "",
          description: material.description ?? "",
        }}
      />
    </div>
  );
}