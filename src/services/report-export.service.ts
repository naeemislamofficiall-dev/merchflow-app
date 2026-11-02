import { REPORTS } from "@/app/(app)/analytics/reports";
import { BusinessRuleError } from "@/lib/business-rules";
import {
  CSV_BOM,
  exportFileName,
  toCsv,
  type ExportFormat,
} from "@/lib/report-export";
import { buildXlsx } from "@/lib/report-excel";
import { BaseService } from "./base.service";

export type ExportedReport = {
  fileName: string;
  contentType: string;
  body: string | Uint8Array;
};

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

class ReportExportService extends BaseService {
  // Data scope automatic: def.run() nijer service-e listFilter diye scope kore.
  // Tai user-er analytics.view + analytics.export dutor-i lagbe.
  async export(input: { reportKey: string; format: ExportFormat; from?: string; to?: string }): Promise<ExportedReport> {
    const user = await this.guard("analytics.export");
    const def = REPORTS.find((r) => r.key === input.reportKey);
    if (!def) throw new BusinessRuleError("Unknown report");

    const range = def.ranged ? { from: input.from, to: input.to } : {};
    const result = await def.run(range);

    await this.audit({
      user,
      action: "CREATE",
      entity: "ReportExport",
      entityId: def.key,
      after: { format: input.format, ...range, rows: result.rows.length },
    });

    return input.format === "csv"
      ? {
          fileName: exportFileName(def.key, "csv"),
          contentType: "text/csv; charset=utf-8",
          body: CSV_BOM + toCsv(result.columns, result.rows),
        }
      : {
          fileName: exportFileName(def.key, "xlsx"),
          contentType: XLSX_TYPE,
          body: await buildXlsx({
            title: def.title,
            columns: result.columns,
            rows: result.rows,
            summary: result.summary,
          }),
        };
  }
}

export const reportExportService = new ReportExportService();