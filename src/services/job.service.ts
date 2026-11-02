import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { isJobKey, JOB_KEYS, JOB_LABELS } from "@/lib/job-result";
import { BaseService } from "./base.service";
import { executeRun, queueRun } from "./job-runner";

class JobService extends BaseService {
  async latestPerJob() {
    await this.guard("job.view");
    return Promise.all(
      JOB_KEYS.map(async (key) => ({
        key,
        label: JOB_LABELS[key],
        run: await prisma.jobRun.findFirst({ where: { jobKey: key }, orderBy: { createdAt: "desc" } }),
      }))
    );
  }

  async recent(take = 50) {
    await this.guard("job.view");
    return prisma.jobRun.findMany({ orderBy: { createdAt: "desc" }, take });
  }

  // Request atke na: run QUEUED rekhe response diye dey, kaj after()-e chole
  async runNow(key: string) {
    const user = await this.guard("job.run");
    if (!isJobKey(key)) throw new BusinessRuleError("Unknown job");
    const run = await queueRun(key, "MANUAL", user.id);
    await this.audit({ user, action: "CREATE", entity: "JobRun", entityId: run.id, after: { jobKey: key } });
    after(() => executeRun(run.id, key));
    return { id: run.id };
  }
}

export const jobService = new JobService();