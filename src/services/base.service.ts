import { requirePermission, type SessionUser } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { resolveScope, type DataScope } from "@/lib/scope";

export abstract class BaseService {
  // permission চেক করে ইউজার ফেরত দেয়
  protected async guard(code: string): Promise<SessionUser> {
    return requirePermission(code);
  }

  // ইউজার কোন company ও factory-র ডাটা দেখতে পারে
  protected async scopeOf(user: SessionUser): Promise<DataScope> {
    return resolveScope(user.id);
  }

  protected audit = writeAudit;
}