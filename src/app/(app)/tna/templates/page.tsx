import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { tnaService } from "@/services/tna.service";
import { TemplateForm } from "./template-form";

export default async function TnaTemplatesPage() {
  const templates = await tnaService.listTemplates();

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title="T&A templates"
        description="A template lists the milestones and how many days before shipment each one must finish"
        actions={
          <Link href="/tna" className={buttonVariants({ variant: "outline" })}>
            Back to plans
          </Link>
        }
      />

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No templates yet. Create your first one below.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle>{t.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {t.tasks.map((task, i) => (
                  <div key={task.id} className="flex justify-between gap-3 border-b py-1.5 last:border-0">
                    <span>
                      {i + 1}. {task.name}
                    </span>
                    <span className="text-muted-foreground">{task.daysBefore} days before ship</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateForm />
    </div>
  );
}