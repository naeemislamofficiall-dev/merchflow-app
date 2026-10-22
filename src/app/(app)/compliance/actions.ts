"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { complianceService } from "@/services/compliance.service";

export async function createCertificateTypeAction(values: Record<string, string>) {
  return runAction(async () => {
    const r = await complianceService.createCertificateType(dropEmpty(values));
    return { id: r.id };
  });
}
export async function toggleCertificateTypeAction(id: string) {
  return runAction(async () => {
    await complianceService.toggleCertificateType(id);
    return { id };
  });
}
export async function createAuditTypeAction(values: Record<string, string>) {
  return runAction(async () => {
    const r = await complianceService.createAuditType(dropEmpty(values));
    return { id: r.id };
  });
}
export async function toggleAuditTypeAction(id: string) {
  return runAction(async () => {
    await complianceService.toggleAuditType(id);
    return { id };
  });
}
export async function createCertificateAction(values: Record<string, string>) {
  return runAction(async () => {
    const r = await complianceService.createCertificate(dropEmpty(values));
    return { id: r.id };
  });
}
export async function revokeCertificateAction(id: string, reason?: string) {
  return runAction(async () => {
    await complianceService.revokeCertificate(id, reason ?? "");
    return { id };
  });
}
export async function createAuditAction(values: Record<string, string>) {
  return runAction(async () => {
    const r = await complianceService.createAudit(dropEmpty(values));
    return { id: r.id };
  });
}
export async function cancelAuditAction(id: string, reason?: string) {
  return runAction(async () => {
    await complianceService.cancelAudit(id, reason ?? "");
    return { id };
  });
}
