import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { supplierService } from "@/services/supplier.service";
import { ActiveToggle } from "./active-toggle";
import { ContactForm } from "./contact-form";

const TABS: DetailTab[] = [
  { key: "overview", label: "Overview" },
  { key: "contacts", label: "Contacts" },
];

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value || "-"}</span>
    </div>
  );
}

export default async function SupplierDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await props.params;
  const { tab = "overview" } = await props.searchParams;

  const supplier = await supplierService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!supplier) notFound();

  const score = await supplierService.scorecard(id);

  return (
    <DetailPage
      code={supplier.code}
      title={supplier.name}
      status={supplier.status}
      basePath={`/suppliers/${id}`}
      tabs={TABS}
      activeTab={tab}
      actions={
        <div className="flex items-start gap-2">
          <Link href={`/suppliers/${id}/edit`} className={buttonVariants({ size: "sm", variant: "outline" })}>
            Edit
          </Link>
          <ActiveToggle id={id} active={supplier.status === "ACTIVE"} />
        </div>
      }
      kpis={[
        { label: "On-time delivery", value: `${score.onTimeDeliveryPct}%` },
        { label: "Quality acceptance", value: `${score.qualityAcceptancePct}%` },
        { label: "Rejection", value: `${score.rejectionPct}%` },
        { label: "PO completion", value: `${score.poCompletionPct}%` },
        { label: "Lead time", value: score.leadTimeDays === null ? "-" : `${score.leadTimeDays} d` },
      ]}
      side={
        <>
          <SidePanelSection title="Related records">
            <p className="text-muted-foreground">Purchase orders and quotations will appear here.</p>
          </SidePanelSection>
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">
              {supplier.contacts.length === 0 ? "Add a contact person." : "Send an RFQ or raise a purchase order."}
            </p>
          </SidePanelSection>
        </>
      }
    >
      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Category" value={supplier.category.charAt(0) + supplier.category.slice(1).toLowerCase()} />
              <Row label="Country" value={supplier.country} />
              <Row label="Currency" value={supplier.currency} />
              <Row label="Payment terms" value={supplier.paymentTerms} />
              <Row label="Lead time (days)" value={supplier.leadTimeDays === null ? null : String(supplier.leadTimeDays)} />
              <Row label="Address" value={supplier.address} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bank details</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Bank" value={supplier.bankName} />
              <Row label="Branch" value={supplier.bankBranch} />
              <Row label="Account name" value={supplier.bankAccountName} />
              <Row label="Account number" value={supplier.bankAccountNo} />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "contacts" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {supplier.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts yet</p>
              ) : (
                supplier.contacts.map((c) => (
                  <div key={c.id} className="border-b py-2 text-sm last:border-0">
                    <p className="font-medium">
                      {c.name} {c.isPrimary && <span className="text-xs text-gold-600">(primary)</span>}
                    </p>
                    <p className="text-muted-foreground">
                      {[c.designation, c.email, c.phone].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <ContactForm supplierId={id} />
        </div>
      )}
    </DetailPage>
  );
}