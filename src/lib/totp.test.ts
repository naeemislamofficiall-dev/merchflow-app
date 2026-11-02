import { beforeAll, describe, expect, it } from "vitest";
import {
  base32Decode, base32Encode, decryptSecret, encryptSecret, generateBackupCodes, generateSecret,
  hashBackupCode, isBackupCodeShape, matchTotpStep, totpAt, verifyTotp,
} from "./totp";

// RFC 6238 test secret "12345678901234567890"
const RFC = base32Encode(Buffer.from("12345678901234567890"));

beforeAll(() => { process.env.AUTH_SECRET = "unit-test-secret"; });

describe("totp", () => {
  it("matches RFC 6238 vector at t=59s", () => expect(totpAt(RFC, 59_000)).toBe("287082"));
  it("matches RFC 6238 vector at t=1111111109s", () => expect(totpAt(RFC, 1_111_111_109_000)).toBe("081804"));
  it("base32 round trips", () => {
    const s = generateSecret();
    expect(base32Encode(base32Decode(s))).toBe(s);
  });
  it("accepts +-1 step and rejects far codes / junk", () => {
    const t = 1_700_000_000_000;
    const code = totpAt(RFC, t);
    expect(verifyTotp(RFC, code, t + 30_000)).toBe(true);
    expect(verifyTotp(RFC, code, t + 120_000)).toBe(false);
    expect(verifyTotp(RFC, "abcdef", t)).toBe(false);
  });
  it("returns the matched step number (used for replay protection)", () => {
    const t = 1_700_000_000_000;
    const code = totpAt(RFC, t);
    const step = Math.floor(t / 1000 / 30);
    expect(matchTotpStep(RFC, code, t)).toBe(step);
    expect(matchTotpStep(RFC, code, t + 30_000)).toBe(step); // ek step pore-o same step ferot dey
    expect(matchTotpStep(RFC, "000000", t)).toBeNull();
  });
  it("encrypts and decrypts the secret", () => {
    const s = generateSecret();
    const enc = encryptSecret(s);
    expect(enc).not.toContain(s);
    expect(decryptSecret(enc)).toBe(s);
  });
});

describe("backup codes", () => {
  it("generates 8 unique well-formed codes", () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    for (const c of codes) {
      expect(c).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
      expect(isBackupCodeShape(c)).toBe(true);
    }
  });
  it("hash ignores case and dash, differs per code, is never the plaintext", () => {
    const [a, b] = generateBackupCodes(2);
    expect(hashBackupCode(a)).toBe(hashBackupCode(a.toLowerCase().replace("-", " ")));
    expect(hashBackupCode(a)).not.toBe(hashBackupCode(b));
    expect(hashBackupCode(a)).not.toContain(a.replace("-", ""));
  });
  it("6 digit totp is not mistaken for a backup code", () => {
    expect(isBackupCodeShape("123456")).toBe(false);
  });
});
