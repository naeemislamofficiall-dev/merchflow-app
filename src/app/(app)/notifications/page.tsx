import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationType } from "@/generated/prisma/enums";
import { notificationService } from "@/services/notification.service";
import { NotificationList } from "./notification-list";
import { PreferencesForm } from "./preferences-form";

export default async function NotificationsPage() {
  const [list, prefs] = await Promise.all([notificationService.list(false, 100), notificationService.getPreferences()]);

  const items = list.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    href: n.href ?? null,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  }));

  // সেভ করা পছন্দ না থাকলে ডিফল্ট: In-app চালু, Email বন্ধ (notify() এর নিয়মের সাথে মিল)
  const rows = Object.values(NotificationType).map((type) => {
    const p = prefs.find((x) => x.type === type);
    return { type, inApp: p?.inApp ?? true, email: p?.email ?? false };
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Notifications" description="Your latest messages and how you want to receive them" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Latest 100</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <NotificationList items={items} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <PreferencesForm rows={rows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}