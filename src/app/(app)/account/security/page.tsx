import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/permissions";
import { mfaService } from "@/services/mfa.service";
import { beginMfaAction, disableMfaAction, enableMfaAction, regenerateCodesAction } from "./actions";
import { CodeForm } from "./code-form";

const input = "rounded-md border bg-background px-3 py-2";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser();
  const [s, q] = await Promise.all([mfaService.status(), searchParams]);

  return (
    <div className="max-w-xl space-y-5">
      <PageHeader title="Account security" description="Two-factor authentication (authenticator app)." />
      {q.error && <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{q.error}</p>}

      {s.state === "OFF" && (
        <form action={beginMfaAction} className="space-y-3 rounded-xl border p-4">
          <p className="text-sm">Two-factor is <strong>off</strong>. Turn it on to require a 6-digit code at login.</p>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Set up</button>
        </form>
      )}

      {s.state === "PENDING" && (
        <div className="space-y-3">
          <div className="space-y-2 rounded-xl border p-4">
            <p className="text-sm">1. Scan this QR in Google Authenticator / Microsoft Authenticator / Authy.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.qr} alt="MFA QR code" width={220} height={220} />
            <p className="text-xs text-muted-foreground">Cannot scan? Enter this key manually: <code>{s.secret}</code></p>
          </div>
          <CodeForm action={enableMfaAction} submitLabel="Turn on" intro="2. Enter the 6-digit code to confirm." />
        </div>
      )}

      {s.state === "ON" && (
        <div className="space-y-4">
          <p className="rounded-xl border p-4 text-sm">
            Two-factor is <strong className="text-emerald-700">on</strong>. Backup codes left: <strong>{s.backupLeft}</strong>
            {s.backupLeft <= 2 && <span className="text-red-700"> (running low, generate new ones)</span>}
          </p>
          <CodeForm action={regenerateCodesAction} submitLabel="Generate new backup codes" intro="New backup codes replace all old ones. Enter a current authenticator code." />
          <form action={disableMfaAction} className="space-y-3 rounded-xl border p-4">
            <p className="text-sm">To turn two-factor off, enter an authenticator code or one backup code.</p>
            <input name="code" required maxLength={12} autoComplete="off" className={input} />
            <div><button className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700">Turn off</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
