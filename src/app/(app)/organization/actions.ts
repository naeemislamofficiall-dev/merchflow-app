"use server";

import { revalidatePath } from "next/cache";
import { dropEmpty, runAction } from "@/lib/action-result";
import { organizationService } from "@/services/organization.service";

export type OrgKind = "building" | "floor" | "department" | "line";

export async function createOrgAction(kind: OrgKind, values: Record<string, string>) {
  return runAction(async () => {
    const data = dropEmpty(values);
    const row =
      kind === "building"
        ? await organizationService.createBuilding(data)
        : kind === "floor"
          ? await organizationService.createFloor(data)
          : kind === "department"
            ? await organizationService.createDepartment(data)
            : await organizationService.createLine(data);
    revalidatePath("/organization");
    return { id: row.id };
  });
}