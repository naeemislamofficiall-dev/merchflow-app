# MFA: auth.ts ar login page patch (ei duto file apnar existing file, tai manually edit korte hobe)

## 1) src/lib/auth.ts

(a) import line add:
    import { checkLoginOtp } from "@/services/mfa.service";

(b) Credentials({ credentials: { email: {}, password: {} }, ...  ->  otp add:
    credentials: { email: {}, password: {}, otp: {} },

(c) `const ok = await bcrypt.compare(...)` block-er THEEK PORE (if (!ok) {...} er pore), eta add:

        // MFA on thakle 6-digit code lagbe
        const otp = typeof raw?.otp === "string" ? raw.otp.trim() : undefined;
        if (!(await checkLoginOtp(user.id, otp))) {
          await recordLoginFailure(email, user.id).catch(() => undefined);
          return null;
        }

## 2) src/app/login/page.tsx

(a) signIn(...) er moddhe:
      email: form.get("email"),
      password: form.get("password"),
      otp: form.get("otp") ?? "",
      redirect: false,

(b) password field-er div-er pore ei block:
        <div className="space-y-1.5">
          <Label htmlFor="otp">Authenticator code (only if two-factor is on)</Label>
          <Input id="otp" name="otp" inputMode="numeric" maxLength={6} autoComplete="one-time-code" />
        </div>

(c) error message ta bodle din: "Email, password or code is wrong"

## Dhyan din
- Prothome nijer account-e /account/security theke MFA on kore, ekta authenticator app-e kaj korche kina test korun, tarpor onno user.
- Phone hariye gele user-ke lockout hobe: DB theke `DELETE FROM "UserMfa" WHERE "userId" = '...'` diye reset korte hobe (ekhon admin UI nai).
- Replay protection (ekoi code 30s-er moddhe duibar) ekhono nai.
