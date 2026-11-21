import { UserCog } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { getAvatarUrl } from "@/lib/avatar";
import { PageBand } from "@/components/approvals/ui";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await requireUser();
  const [me, role, avatar] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { name: true } }),
    prisma.role.findUnique({ where: { id: user.roleId }, select: { name: true } }),
    getAvatarUrl(user.id),
  ]);

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
            <UserCog className="h-8 w-8" strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Edit Profile</h1>
            <p className="text-sm text-slate-500">Your name and profile photo</p>
          </div>
        </header>
      </PageBand>
      <ProfileForm name={me?.name ?? user.email} email={user.email} role={role?.name ?? ""} avatarUrl={avatar} />
    </div>
  );
}