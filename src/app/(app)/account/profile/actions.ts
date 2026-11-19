"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { AVATAR_DIR, removeAvatar } from "@/lib/avatar";

export type ProfileResult = { ok: true; message: string } | { ok: false; error: string };

const MAX_BYTES = 2 * 1024 * 1024;

// file-er asol dhoron byte dekhe check (naam/extension-e bhorsha na kore)
function sniff(b: Buffer): "jpg" | "png" | "webp" | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") {
    return "webp";
  }
  return null;
}

export async function updateProfileAction(
  _prev: ProfileResult | null,
  formData: FormData
): Promise<ProfileResult> {
  try {
    const user = await requireUser();

    const name = z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(80, "Name is too long")
      .safeParse(formData.get("name"));
    if (!name.success) return { ok: false, error: name.error.issues[0].message };

    const file = formData.get("avatar");
    let ext: "jpg" | "png" | "webp" | null = null;
    let bytes: Buffer | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_BYTES) return { ok: false, error: "Image must be 2 MB or smaller" };
      bytes = Buffer.from(await file.arrayBuffer());
      ext = sniff(bytes);
      if (!ext) return { ok: false, error: "Use a JPG, PNG or WebP image" };
    }

    await prisma.user.update({ where: { id: user.id }, data: { name: name.data } });

    if (bytes && ext) {
      await fs.mkdir(AVATAR_DIR, { recursive: true });
      await removeAvatar(user.id);
      await fs.writeFile(path.join(AVATAR_DIR, `${user.id}.${ext}`), bytes);
    } else if (formData.get("removeAvatar") === "1") {
      await removeAvatar(user.id);
    }

    revalidatePath("/", "layout");
    return { ok: true, message: "Profile updated" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save profile" };
  }
}