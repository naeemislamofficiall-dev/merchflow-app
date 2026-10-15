import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import type { NotificationType } from "@/generated/prisma/enums";

type NotifyInput = {
  companyId: string;
  recipientId: string;
  type?: NotificationType;
  title: string;
  message: string;
  href?: string;
  entityType?: string;
  entityId?: string;
};

// অন্য সার্ভিস থেকে ডাকার জন্য। ব্যবহারকারীর পছন্দ মেনে In-app আর Email সারি বানায়।
export async function notify(input: NotifyInput) {
  const type = input.type ?? "GENERAL";
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_type: { userId: input.recipientId, type } },
  });
  const wantInApp = pref?.inApp ?? true;
  const wantEmail = pref?.email ?? false;

  const base = {
    companyId: input.companyId,
    recipientId: input.recipientId,
    type,
    title: input.title,
    message: input.message,
    href: input.href,
    entityType: input.entityType,
    entityId: input.entityId,
  };

  const rows = [];
  if (wantInApp) rows.push({ ...base, channel: "IN_APP" as const, sentAt: new Date() });
  // ইমেইল আসলে পাঠানো হবে ব্যাচ ১৫-তে (Resend), এখন শুধু সারি জমা থাকে
  if (wantEmail) rows.push({ ...base, channel: "EMAIL" as const });
  if (rows.length > 0) await prisma.notification.createMany({ data: rows });
  return rows.length;
}

class NotificationService {
  async list(unreadOnly = false, take = 30) {
    const user = await requireUser();
    return prisma.notification.findMany({
      where: {
        recipientId: user.id,
        channel: "IN_APP",
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async unreadCount() {
    const user = await requireUser();
    return prisma.notification.count({
      where: { recipientId: user.id, channel: "IN_APP", readAt: null },
    });
  }

  async markRead(id: string) {
    const user = await requireUser();
    await prisma.notification.updateMany({
      where: { id, recipientId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead() {
    const user = await requireUser();
    await prisma.notification.updateMany({
      where: { recipientId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async getPreferences() {
    const user = await requireUser();
    return prisma.notificationPreference.findMany({ where: { userId: user.id } });
  }

  async setPreference(type: NotificationType, inApp: boolean, email: boolean) {
    const user = await requireUser();
    return prisma.notificationPreference.upsert({
      where: { userId_type: { userId: user.id, type } },
      update: { inApp, email },
      create: { userId: user.id, type, inApp, email },
    });
  }
}

export const notificationService = new NotificationService();