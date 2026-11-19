import { alertService } from "@/services/alert.service";
import { AlertsView, type AlertRow } from "@/components/alerts/alerts-view";

export default async function AlertsPage() {
  let rows: AlertRow[] | null = null;
  try {
    const list = await alertService.list();
    rows = list.map((a) => ({
      id: a.id,
      severity: a.severity,
      category: a.category,
      title: a.title,
      message: a.message,
      href: a.href,
      since: new Date(a.since).toISOString(),
    }));
  } catch {
    rows = null; // alert.view permission nei
  }

  if (!rows) return <p className="text-muted-foreground">You do not have access to alerts.</p>;

  return <AlertsView alerts={rows} nowIso={new Date().toISOString()} />;
}