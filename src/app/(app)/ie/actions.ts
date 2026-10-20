"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { ieService } from "@/services/ie.service";

type OpValues = {
  name: string;
  machineType: string;
  smv: string;
  skillLevel: string;
  operators: string;
};

export async function saveBulletinAction(styleId: string, ops: OpValues[]) {
  return runAction(async () => {
    const operations = ops.map((o) => {
      const { smv, operators, ...rest } = dropEmpty(o);
      return {
        ...rest,
        smv: Number(smv),
        ...(operators !== undefined ? { operators: Number(operators) } : {}),
      };
    });
    const r = await ieService.saveBulletin({ styleId, operations });
    return { totalSmv: r.totalSmv };
  });
}