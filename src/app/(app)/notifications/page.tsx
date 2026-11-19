import { Bell, BellRing, CalendarCheck, Inbox, Settings2 } from "lucide-react";
import { NotificationType } from "@/generated/prisma/enums";
import { notificationService } from "@/services/notification.service";
import { Panel } from "@/components/dashboard/widgets";
import { StatCard } from "@/components/approvals/ui";
import { NotificationList } from "./notification-list";
import { PreferencesForm } from "./preferences-form";

const TZ = "Asia/Dhaka";

export default async function NotificationsPage() {
  const [list, prefs, unreadTotal] = await Promise.all([
    notificationService.list(false, 100),
    notificationService.getPreferences(),
    notificationService.unreadCount(),
  ]);

  const now = new Date();
  const todayKey = now.toLocaleDateString("en-CA", { timeZone: TZ });

  const items = list.map((n) => ({
    id: n.id,
    type: n.type as string,
    title: n.title,
    message: n.message,
    href: n.href ?? null,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  }));
  const today = list.filter((n) => n.createdAt.toLocaleDateString("en-CA", { timeZone: TZ }) === todayKey).length;

  // save kora pochhondo na thakle default: In-app chalu, Email bondho (notify()-er niyomer shathe mil)
  const rows = Object.values(NotificationType).map((type) => {
    const p = prefs.find((x) => x.type === type);
    return { type, inApp: p?.inApp ?? true, email: p?.email ?? false };
  });

  return (
    <div className="stagger space-y-5">
      <header className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-card">
          <Bell className="h-8 w-8" fill="currentColor" fillOpacity={0.15} />
        </span>
        <div>
          <h1 className="font-heading text-3xl font-semibold text-navy-800">Notifications</h1>
          <p className="text-sm text-slate-500">Your latest messages and how you want to receive them</p>
        </div>
      </header>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
        <StatCard theme="blue" icon={BellRing} label="Unread" value={unreadTotal} sub="Waiting for you" />
        <StatCard theme="green" icon={CalendarCheck} label="Today" value={today} sub="Received today" />
        <StatCard theme="violet" icon={Inbox} label="Latest" value={list.length} sub="Showing up to 100" />
      </div>

      <div className="stagger grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Panel icon={Bell} title="Latest notifications" subtitle="Newest first">
          <NotificationList items={items} nowIso={now.toISOString()} />
        </Panel>
        <Panel
          icon={Settings2}
          iconClass="bg-violet-100 text-violet-600"
          title="Preferences"
          subtitle="Choose how you want to receive each message"
        >
          <PreferencesForm rows={rows} />
        </Panel>
      </div>
    </div>
  );
}