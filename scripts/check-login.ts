import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

// শুধু পড়ে, ডাটাবেসে কিছু বদলায় না। পাসওয়ার্ড বা URL ছাপে না।
async function main() {
  const email = "admin@merchflow.local";
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  if (!user) {
    console.log("১) ইউজার নেই -> npx tsx scripts/create-admin.ts চালাতে হবে");
    return;
  }
  console.log("১) ইউজার আছে, status =", user.status);
  console.log("২) পাসওয়ার্ড Admin@12345 মেলে?", await bcrypt.compare("Admin@12345", user.passwordHash));
  console.log(
    "৩) role-এ permission সংখ্যা =", user.role.permissions.length,
    "| '*' আছে?", user.role.permissions.some((p) => p.permission.key === "*")
  );
  console.log("৪) companyId আছে?", user.companyId ? "হ্যাঁ" : "না (null)");

  const since = new Date(Date.now() - 15 * 60_000);
  const fails = await prisma.auditLog.count({
    where: { action: "LOGIN_FAILED", entity: "LoginAttempt", entityId: email, createdAt: { gte: since } },
  });
  console.log("৫) গত ১৫ মিনিটে ভুল চেষ্টা =", fails, fails >= 5 ? "-> আটকে আছে" : "");
}

main()
  .catch((e) => {
    console.error("ডাটাবেস সংযোগ বা কোয়েরির এরর:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());