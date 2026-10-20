"use server";

import bcrypt from "bcryptjs";
import { runAction } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { readResetToken } from "@/lib/reset-token";
import { passwordSchema } from "@/services/user.service";

export async function resetWithTokenAction(token: string, password: string) {
  return runAction(async () => {
    const user = await readResetToken(token);
    if (!user) throw new BusinessRuleError("This link is invalid or has expired");
    const pw = passwordSchema.parse(password);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(pw, 10) } });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "UPDATE",
        entity: "User",
        entityId: user.id,
        after: { email: user.email },
        reason: "Password reset via link",
      },
    });
    return { done: true };
  });
}
