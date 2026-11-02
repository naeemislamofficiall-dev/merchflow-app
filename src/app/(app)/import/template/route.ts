import { NextResponse, type NextRequest } from "next/server";
import { IMPORTERS, type ImportType } from "@/lib/import-schemas";
import { CSV_BOM, csvField } from "@/lib/report-export";
import { AuthError, requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("import.run");
    const type = req.nextUrl.searchParams.get("type") ?? "";
    if (!(type in IMPORTERS)) return NextResponse.json({ error: "Unknown import type" }, { status: 400 });
    const cols = IMPORTERS[type as ImportType].columns;
    const body = CSV_BOM + cols.map((c) => csvField(c.label)).join(",") + "\r\n";
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="import-template-${type.toLowerCase()}.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}