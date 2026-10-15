import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { BaseService } from "./base.service";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // ২০ MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/csv",
  "application/zip",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

// অনুমতিহীন ধরন বা বড় ফাইল আটকায় (CAD-এর মতো অন্য ধরন লাগলে তালিকায় যোগ করবেন)
function assertFileAllowed(mimeType?: string, sizeBytes?: number) {
  if (mimeType && !ALLOWED_MIME.has(mimeType)) {
    throw new BusinessRuleError("This file type is not allowed");
  }
  if (sizeBytes !== undefined && sizeBytes > MAX_FILE_BYTES) {
    throw new BusinessRuleError("File is larger than 20 MB");
  }
}

const registerSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  docType: z.string().max(60).optional(),
  fileName: z.string().min(1),
  originalName: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  storageKey: z.string().min(1),
  storageUrl: z.string().optional(),
  checksum: z.string().optional(),
  access: z.enum(["COMPANY", "FACTORY", "PRIVATE"]).optional(), // ডিফল্ট Prisma দেয়
  expiryDate: z.coerce.date().optional(),
});

// BigInt সরাসরি JSON-এ যায় না, তাই সংখ্যায় বদলে দিই
function plain<T extends { sizeBytes: bigint | null }>(row: T) {
  return { ...row, sizeBytes: row.sizeBytes === null ? null : Number(row.sizeBytes) };
}

class DocumentService extends BaseService {
  async register(input: unknown) {
    const user = await this.guard("document.upload");
    const data = registerSchema.parse(input);
    assertFileAllowed(data.mimeType, data.sizeBytes);
    const row = await prisma.attachment.create({
      data: {
        ...data,
        sizeBytes: data.sizeBytes === undefined ? undefined : BigInt(data.sizeBytes),
        companyId: user.companyId,
        uploadedById: user.id,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "Attachment", entityId: row.id, after: plain(row) });
    return plain(row);
  }

  // একই ডকুমেন্টের নতুন ভার্সন, পুরনোটা থেকে যায়
  async newVersion(previousId: string, input: unknown) {
    const user = await this.guard("document.upload");
    const data = registerSchema.omit({ entityType: true, entityId: true }).parse(input);
    assertFileAllowed(data.mimeType, data.sizeBytes);
    const old = await prisma.attachment.findUnique({ where: { id: previousId } });
    if (!old || old.companyId !== user.companyId || old.deletedAt) {
      throw new BusinessRuleError("Document not found");
    }
    const row = await prisma.attachment.create({
      data: {
        ...data,
        sizeBytes: data.sizeBytes === undefined ? undefined : BigInt(data.sizeBytes),
        entityType: old.entityType,
        entityId: old.entityId,
        docType: data.docType ?? old.docType,
        companyId: user.companyId,
        uploadedById: user.id,
        version: old.version + 1,
        previousVersionId: old.id,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "Attachment", entityId: row.id, after: plain(row) });
    return plain(row);
  }

  // কোনো রেকর্ডের (যেমন Order বা Supplier) সব ডকুমেন্ট। PRIVATE শুধু আপলোডকারী দেখবে
  async list(entityType: string, entityId: string) {
    const user = await this.guard("document.view");
    const rows = await prisma.attachment.findMany({
      where: {
        companyId: user.companyId,
        entityType,
        entityId,
        deletedAt: null,
        OR: [{ access: { not: "PRIVATE" } }, { uploadedById: user.id }],
      },
      orderBy: [{ docType: "asc" }, { version: "desc" }],
    });
    return rows.map(plain);
  }

  async remove(id: string) {
    const user = await this.guard("document.delete");
    const old = await prisma.attachment.findUnique({ where: { id } });
    if (!old || old.companyId !== user.companyId || old.deletedAt) {
      throw new BusinessRuleError("Document not found");
    }
    await prisma.attachment.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit({ user, action: "DELETE", entity: "Attachment", entityId: id, before: plain(old) });
  }

  // মেয়াদ শেষ হয়ে আসছে (Certificate expiry-র সতর্কতার জন্য)
  async listExpiring(days = 30) {
    const user = await this.guard("document.view");
    const limit = new Date();
    limit.setDate(limit.getDate() + days);
    const rows = await prisma.attachment.findMany({
      where: {
        companyId: user.companyId,
        deletedAt: null,
        expiryDate: { not: null, lte: limit },
      },
      orderBy: { expiryDate: "asc" },
    });
    return rows.map(plain);
  }
}

export const documentService = new DocumentService();