import { NextResponse, type NextRequest } from "next/server";
import { BusinessRuleError } from "@/lib/business-rules";
import { MAX_IMPORT_BYTES, fileToTable } from "@/lib/import-file";
import { sha256Hex } from "@/lib/import-parse";
import { AuthError } from "@/lib/permissions";
import { importService } from "@/services/import.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server Action-er 1MB limit eriye, upload route handler diye
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const type = String(form.get("type") ?? "");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file" }, { status: 400 });
    if (file.size > MAX_IMPORT_BYTES) return NextResponse.json({ error: "File is larger than 5 MB" }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const table = await fileToTable(file.name, bytes);
    const res = await importService.validate({ type, fileName: file.name, hash: sha256Hex(bytes), table });
    return NextResponse.json(res);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof BusinessRuleError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("import upload failed", err);
    return NextResponse.json({ error: "Could not read this file" }, { status: 500 });
  }
}