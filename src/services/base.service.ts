import { requirePermission, type SessionUser } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

export abstract class BaseService {
  // permission চেক করে ইউজার ফেরত দেয়
  protected async guard(code: string): Promise<SessionUser> {
    return requirePermission(code);
  }

  protected audit = writeAudit;
}