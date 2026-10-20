"use server";

import { runAction } from "@/lib/action-result";
import { sampleService } from "@/services/sample.service";
import type { SampleStatus } from "@/generated/prisma/enums";

export type CreateSampleInput = {
  styleId: string;
  sampleType: string;
  quantity?: number;
  dueDate?: string;
  plannedCompletion?: string;
  cost?: number;
  orderId?: string;
  materialRequirement?: string;
  comments?: string;
};

export async function createSampleAction(input: CreateSampleInput) {
  return runAction(async () => {
    const row = await sampleService.create(input);
    return { id: row.id };
  });
}

export async function changeSampleStatusAction(
  id: string,
  to: SampleStatus,
  extra: { courier?: string; trackingNo?: string } = {}
) {
  return runAction(async () => {
    await sampleService.changeStatus(id, to, extra);
    return { done: true };
  });
}

export async function decideSampleAction(id: string, decision: "APPROVED" | "REJECTED", comments?: string) {
  return runAction(async () => {
    await sampleService.decide(id, decision, comments);
    return { done: true };
  });
}
