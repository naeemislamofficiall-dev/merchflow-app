import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/permissions";
import { findAvatar } from "@/lib/avatar";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
  } catch {
    return new NextResponse(null, { status: 401 });
  }
  const { id } = await params;
  if (!/^[a-z0-9]+$/i.test(id)) return new NextResponse(null, { status: 400 });

  const a = await findAvatar(id);
  if (!a) return new NextResponse(null, { status: 404 });

  const data = await fs.readFile(a.file);
  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": a.mime, "Cache-Control": "private, max-age=86400" },
  });
}