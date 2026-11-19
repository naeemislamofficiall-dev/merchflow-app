import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { getAvatarUrl } from "@/lib/avatar";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await requireUser();
  const [me, role, avatar] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { name: true } }),
    prisma.role.findUnique({ where: { id: user.roleId }, select: { name: true } }),
    getAvatarUrl(user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Edit profile" description="Your name and profile photo" />
      <ProfileForm name={me?.name ?? user.email} email={user.email} role={role?.name ?? ""} avatarUrl={avatar} />
    </div>
  );
}