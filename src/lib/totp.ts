import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of s.replace(/=+$/, "").toUpperCase()) {
    const i = B32.indexOf(ch);
    if (i < 0) continue;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export const generateSecret = () => base32Encode(randomBytes(20));

// RFC 6238 (HMAC-SHA1, 30s step, 6 digit)
export function totpAt(secret: string, timeMs: number, digits = 6, stepSec = 30): string {
  const counter = Math.floor(timeMs / 1000 / stepSec);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const off = h[h.length - 1] & 0xf;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

// +-1 step (30s) clock difference-e chole. Match hole oi step number ferot dey (replay thekate), noile null.
export function matchTotpStep(secret: string, code: string, nowMs: number = Date.now(), window = 1): number | null {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const base = Math.floor(nowMs / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    const expected = totpAt(secret, (base + w) * 30_000);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return base + w;
  }
  return null;
}

export const verifyTotp = (secret: string, code: string, nowMs: number = Date.now(), window = 1): boolean =>
  matchTotpStep(secret, code, nowMs, window) !== null;

export const otpauthUrl = (secret: string, account: string, issuer = "MerchFlow") =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

// DB-te secret plaintext-e rakha hoy na: AES-256-GCM, key = AUTH_SECRET theke
function key(): Buffer {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return createHash("sha256").update(`mfa:${s}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(stored: string): string {
  const [iv, tag, enc] = stored.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

// ---------- Backup codes ----------
// 0/O/1/I bad: dekhte confuse hoy. 32 ta char, tai randomBytes % 32 te kono bias nai.
const BACKUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateBackupCodes(n = 8): string[] {
  return Array.from({ length: n }, () => {
    const raw = Array.from(randomBytes(10), (b) => BACKUP_ALPHABET[b % 32]).join("");
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export const normalizeBackupCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const isBackupCodeShape = (c: string) => /^[A-HJ-NP-Z2-9]{10}$/.test(normalizeBackupCode(c));

// DB-te backup code plaintext-e na, keyed hash (AUTH_SECRET theke)
export function hashBackupCode(code: string): string {
  return createHmac("sha256", key()).update(`backup:${normalizeBackupCode(code)}`).digest("hex");
}
