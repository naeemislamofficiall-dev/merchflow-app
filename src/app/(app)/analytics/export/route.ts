import { NextResponse, type NextRequest } from "next/server";
import { parseExportFormat } from "@/lib/report-export";
import { reportExportService } from "@/services/report-export.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const okDate = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const format = parseExportFormat(sp.get("format"));
  const reportKey = sp.get("report");
  if (!format || !reportKey) {
    return NextResponse.json({ error: "report and format (csv or xlsx) are required" }, { status: 400 });
  }
  try {
    const file = await reportExportService.export({
      reportKey,
      format,
      from: okDate(sp.get("from")),
      to: okDate(sp.get("to")),
    });
    const payload = typeof file.body === "string" ? file.body : new Blob([new Uint8Array(file.body)]);
    return new NextResponse(payload, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Export failed";
    const status = /permission|denied|forbidden|unauthor/i.test(msg) ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}