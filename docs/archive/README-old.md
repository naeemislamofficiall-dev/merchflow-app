# Batch 2

Ami apnar zip-er copy-te boshiye `prisma generate`, `tsc --noEmit`, `vitest` (178 test pass), `eslint` chalaiyechi: error nai.
DB-r shathe ar browser-e chalai ni.

## 0. Ekhonkar duto error ager moto thik korun
1. `.next/types/validator.ts ... Cannot find module .../attendance/page.js` -> purono build cache:
       Remove-Item -Recurse -Force .next
2. `Property 'userMfa' does not exist` -> table ta DB-te nai. `sql/user-mfa.sql` Supabase SQL editor-e chalan, tarpor:
       npx prisma db pull
       npx prisma generate
       npx tsc --noEmit
   (`migrate dev` chalaben na.)

## 1. File boshan
- `src/` folder-er shob file apnar project-er `src/`-e copy korun.
  Overwrite hobe: `src/lib/totp.ts`, `src/lib/totp.test.ts`, `src/services/mfa.service.ts`, `src/app/(app)/account/security/*`. Eigulo amar age-er MFA file, tai thik ache.
  Notun: `src/instrumentation.ts`, `.../account/security/code-form.tsx`.
- Login page (`src/app/login/page.tsx`): otp input-ta eibhabe koren (backup code-er jonno 6 digit-er bondhon tulte hobe):
      <Label htmlFor="otp">Authenticator or backup code (only if two-factor is on)</Label>
      <Input id="otp" name="otp" maxLength={12} autoComplete="one-time-code" />
- Alerts-e certificate expiry: `patched-alert-snippet.md` dekhun.
- `docs/backup-and-recovery.md` ar `docs/golden-demo.md`: `[FILL]` gulo apnake bharte hobe.

## 2. Ki ki holo
| Jinish | Ki |
|---|---|
| MFA backup code | 8 ta code, ekbar-i dekhay, ekta ekbar-i cholbe. Phone hariye gele ei code diye login ba MFA off kora jay |
| MFA replay protection | Ekoi 6-digit code 2 bar cholbe na |
| Certificate expiry alert | `/alerts`-e expired = HIGH, 30 diner moddhe = MEDIUM |
| Error logging | Server error hole JSON line log, token/query log hoy na |
| Backup/DR doc, Golden demo script | spec section 80 ar 85 onujayi |
