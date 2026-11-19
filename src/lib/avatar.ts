import { promises as fs } from "fs";
import path from "path";

export const AVATAR_DIR = path.join(process.cwd(), "storage", "avatars");

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function findAvatar(userId: string) {
  for (const ext of Object.keys(MIME_BY_EXT)) {
    const file = path.join(AVATAR_DIR, `${userId}.${ext}`);
    try {
      const st = await fs.stat(file);
      return { file, ext, mime: MIME_BY_EXT[ext], version: Math.round(st.mtimeMs) };
    } catch {
      /* ei extension-e file nei */
    }
  }
  return null;
}

export async function getAvatarUrl(userId: string) {
  const a = await findAvatar(userId);
  return a ? `/api/avatar/${userId}?v=${a.version}` : null;
}

export async function removeAvatar(userId: string) {
  for (const ext of Object.keys(MIME_BY_EXT)) {
    await fs.rm(path.join(AVATAR_DIR, `${userId}.${ext}`), { force: true });
  }
}