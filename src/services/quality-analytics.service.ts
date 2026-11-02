import { prisma } from "@/lib/prisma";
import { dhu, pareto } from "@/lib/dhu";
import type { InspectionStage } from "@/generated/prisma/enums";
import { BaseService } from "./base.service";

class QualityAnalyticsService extends BaseService {
  async dhuReport(opts: { days: number; stage: InspectionStage }) {
    const user = await this.guard("qc.view");
    const since = new Date(Date.now() - opts.days * 86_400_000);
    const inspections = await prisma.inspection.findMany({
      where: { companyId: user.companyId, stage: opts.stage, inspectedAt: { gte: since } },
      include: { occurrences: { select: { defectId: true, quantity: true } } },
      take: 5000,
    });

    let sample = 0, defects = 0;
    const byLine = new Map<string, { sample: number; defects: number }>();
    const byDay = new Map<string, { sample: number; defects: number }>();
    const byDefect = new Map<string, number>();

    for (const i of inspections) {
      const q = i.occurrences.reduce((s, o) => s + o.quantity, 0);
      sample += i.sampleSize;
      defects += q;
      const lk = i.lineId ?? "-";
      const dk = i.inspectedAt.toISOString().slice(0, 10);
      byLine.set(lk, { sample: (byLine.get(lk)?.sample ?? 0) + i.sampleSize, defects: (byLine.get(lk)?.defects ?? 0) + q });
      byDay.set(dk, { sample: (byDay.get(dk)?.sample ?? 0) + i.sampleSize, defects: (byDay.get(dk)?.defects ?? 0) + q });
      for (const o of i.occurrences) byDefect.set(o.defectId, (byDefect.get(o.defectId) ?? 0) + o.quantity);
    }

    const [lines, defectRows] = await Promise.all([
      prisma.line.findMany({ where: { id: { in: [...byLine.keys()] } }, select: { id: true, code: true, name: true } }),
      prisma.defect.findMany({ where: { id: { in: [...byDefect.keys()] } }, select: { id: true, code: true, name: true } }),
    ]);
    const lmap = new Map(lines.map((l) => [l.id, `${l.code} · ${l.name}`]));
    const dmap = new Map(defectRows.map((d) => [d.id, `${d.code} · ${d.name}`]));

    return {
      inspections: inspections.length,
      sample,
      defects,
      overall: dhu(defects, sample),
      lines: [...byLine.entries()]
        .map(([id, v]) => ({ name: id === "-" ? "(no line)" : (lmap.get(id) ?? id), ...v, dhu: dhu(v.defects, v.sample) }))
        .sort((a, b) => b.dhu - a.dhu),
      days: [...byDay.entries()]
        .map(([date, v]) => ({ date, ...v, dhu: dhu(v.defects, v.sample) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      pareto: pareto([...byDefect.entries()].map(([id, qty]) => ({ id, qty }))).map((p) => ({ ...p, name: dmap.get(p.id) ?? p.id })),
    };
  }
}

export const qualityAnalyticsService = new QualityAnalyticsService();
