import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { BusinessRuleError } from "@/lib/business-rules";
import { writeAudit } from "@/lib/audit";
import {
  decryptSecret, encryptSecret, generateBackupCodes, generateSecret, hashBackupCode,
  isBackupCodeShape, matchTotpStep, otpauthUrl,
} from "@/lib/totp";

type MfaRow = NonNullable<Awaited<ReturnType<typeof prisma.userMfa.findUnique>>>;

// Ekoi 6-digit code ekbar-i cholbe: je step-e match korlo seta DB-te rakhi, tar kom/soman step ar cholbe na.
// updateMany-r where shorto atomic, tai duto request ek shathe ashleo ekta-i jitbe.
async function consumeTotp(row: MfaRow, code: string): Promise<boolean> {
  const step = matchTotpStep(decryptSecret(row.secretEnc), code);
  if (step === null) return false;
  const res = await prisma.userMfa.updateMany({
    where: { userId: row.userId, OR: [{ lastUsedStep: null }, { lastUsedStep: { lt: BigInt(step) } }] },
    data: { lastUsedStep: BigInt(step) },
  });
  return res.count === 1;
}

// Backup code: ekbar byabohar korle list theke ber hoye jay
async function consumeBackup(row: MfaRow, code: string): Promise<boolean> {
  if (!isBackupCodeShape(code) || !row.backupCodes) return false;
  const hashes = JSON.parse(row.backupCodes) as string[];
  const h = hashBackupCode(code);
  if (!hashes.includes(h)) return false;
  const res = await prisma.userMfa.updateMany({
    where: { userId: row.userId, backupCodes: row.backupCodes }, // compare-and-swap
    data: { backupCodes: JSON.stringify(hashes.filter((x) => x !== h)) },
  });
  return res.count === 1;
}

async function newBackupCodes(userId: string): Promise<string[]> {
  const codes = generateBackupCodes();
  await prisma.userMfa.update({ where: { userId }, data: { backupCodes: JSON.stringify(codes.map(hashBackupCode)) } });
  return codes; // plaintext shudhu ekbar-i dekhano hoy
}

// Nijer account-er MFA: jekono logged-in user nijer jonno chalate pare, alada permission lage na
class MfaService {
  async status() {
    const user = await requireUser();
    const row = await prisma.userMfa.findUnique({ where: { userId: user.id } });
    if (!row) return { state: "OFF" as const };
    if (row.enabled) {
      const left = row.backupCodes ? (JSON.parse(row.backupCodes) as string[]).length : 0;
      return { state: "ON" as const, backupLeft: left };
    }
    const secret = decryptSecret(row.secretEnc);
    const url = otpauthUrl(secret, user.email ?? user.id);
    return { state: "PENDING" as const, secret, qr: await QRCode.toDataURL(url, { margin: 1, width: 220 }) };
  }

  async begin() {
    const user = await requireUser();
    const row = await prisma.userMfa.findUnique({ where: { userId: user.id } });
    if (row?.enabled) throw new BusinessRuleError("MFA is already on.");
    await prisma.userMfa.upsert({
      where: { userId: user.id },
      update: { secretEnc: encryptSecret(generateSecret()), lastUsedStep: null, backupCodes: null },
      create: { id: randomUUID(), userId: user.id, secretEnc: encryptSecret(generateSecret()) },
    });
  }

  // On kore + prothom backup code set dey
  async enable(code: string): Promise<string[]> {
    const user = await requireUser();
    const row = await prisma.userMfa.findUnique({ where: { userId: user.id } });
    if (!row) throw new BusinessRuleError("Start setup first.");
    if (row.enabled) throw new BusinessRuleError("MFA is already on.");
    if (!(await consumeTotp(row, code))) throw new BusinessRuleError("That code is not correct.");
    await prisma.userMfa.update({ where: { userId: user.id }, data: { enabled: true } });
    const codes = await newBackupCodes(user.id);
    await writeAudit({ user, action: "UPDATE", entity: "UserMfa", entityId: user.id, after: { enabled: true } });
    return codes;
  }

  async regenerateBackupCodes(code: string): Promise<string[]> {
    const user = await requireUser();
    const row = await prisma.userMfa.findUnique({ where: { userId: user.id } });
    if (!row?.enabled) throw new BusinessRuleError("MFA is not on.");
    if (!(await consumeTotp(row, code))) throw new BusinessRuleError("That code is not correct.");
    const codes = await newBackupCodes(user.id);
    await writeAudit({ user, action: "UPDATE", entity: "UserMfa", entityId: user.id, after: { backupCodesRegenerated: true } });
    return codes;
  }

  // Off korte authenticator code ba backup code, duto-i cholbe (phone hariyeo off kora jabe)
  async disable(code: string) {
    const user = await requireUser();
    const row = await prisma.userMfa.findUnique({ where: { userId: user.id } });
    if (!row?.enabled) throw new BusinessRuleError("MFA is not on.");
    if (!((await consumeTotp(row, code)) || (await consumeBackup(row, code)))) {
      throw new BusinessRuleError("That code is not correct.");
    }
    await prisma.userMfa.delete({ where: { userId: user.id } });
    await writeAudit({ user, action: "UPDATE", entity: "UserMfa", entityId: user.id, after: { enabled: false } });
  }
}

export const mfaService = new MfaService();

// auth.ts-er jonno: login-er shomoy. MFA off hole shob shomoy true.
export async function checkLoginOtp(userId: string, otp: string | undefined): Promise<boolean> {
  const row = await prisma.userMfa.findUnique({ where: { userId } });
  if (!row?.enabled) return true;
  if (!otp) return false;
  return (await consumeTotp(row, otp)) || (await consumeBackup(row, otp));
}
