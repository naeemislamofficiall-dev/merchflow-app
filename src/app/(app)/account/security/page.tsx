import { KeyRound, Lock, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { requireUser } from "@/lib/permissions";
import { mfaService } from "@/services/mfa.service";
import { beginMfaAction, disableMfaAction, enableMfaAction, regenerateCodesAction } from "./actions";
import { CodeForm } from "./code-form";

const field =
  "h-11 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";
const card = "space-y-4 rounded-card border border-slate-100 bg-white p-5 shadow-card";

function CardHead({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">{icon}</span>
      <div>
        <h2 className="font-heading text-lg font-semibold text-navy-800">{title}</h2>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser();
  const [s, q] = await Promise.all([mfaService.status(), searchParams]);

  const on = s.state === "ON";

  return (
    <div className="stagger mx-auto max-w-3xl space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Lock className="h-8 w-8" strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Account Security</h1>
              <p className="text-sm text-slate-500">Two-factor authentication (authenticator app).</p>
            </div>
          </div>
        </header>
      </PageBand>

      {q.error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {q.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          theme={on ? "green" : "orange"}
          icon={on ? ShieldCheck : ShieldAlert}
          label="Two-factor"
          value={on ? "On" : s.state === "PENDING" ? "Setting up" : "Off"}
          sub={on ? "A 6-digit code is needed at login" : "Turn it on to protect your account"}
        />
        {on && (
          <StatCard
            theme={s.backupLeft <= 2 ? "red" : "blue"}
            icon={KeyRound}
            label="Backup Codes Left"
            value={s.backupLeft}
            sub={s.backupLeft <= 2 ? "Running low, generate new ones" : "Use one if you lose your phone"}
          />
        )}
      </div>

      {s.state === "OFF" && (
        <form action={beginMfaAction} className={card}>
          <CardHead
            icon={<Smartphone className="h-5 w-5" />}
            title="Two-factor Authentication"
            sub="Add an extra layer of security to your account"
          />
          <p className="text-sm text-slate-600">
            Two-factor is <strong>off</strong>. Turn it on to require a 6-digit code at login.
          </p>
          <button className="inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5">
            Set up
          </button>
        </form>
      )}

      {s.state === "PENDING" && (
        <div className="space-y-5">
          <div className={card}>
            <CardHead
              icon={<Smartphone className="h-5 w-5" />}
              title="Scan the QR Code"
              sub="Google Authenticator, Microsoft Authenticator or Authy"
            />
            <p className="text-sm text-slate-600">1. Scan this QR in your authenticator app.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.qr} alt="MFA QR code" width={220} height={220} className="rounded-lg border border-slate-200" />
            <p className="text-xs text-slate-500">
              Cannot scan? Enter this key manually: <code>{s.secret}</code>
            </p>
          </div>
          <CodeForm action={enableMfaAction} submitLabel="Turn on" intro="2. Enter the 6-digit code to confirm." />
        </div>
      )}

      {s.state === "ON" && (
        <div className="space-y-5">
          <CodeForm
            action={regenerateCodesAction}
            submitLabel="Generate new backup codes"
            intro="New backup codes replace all old ones. Enter a current authenticator code."
          />
          <form action={disableMfaAction} className={card}>
            <CardHead
              icon={<ShieldAlert className="h-5 w-5" />}
              title="Turn Off Two-factor"
              sub="Your account will be less protected"
            />
            <p className="text-sm text-slate-600">
              To turn two-factor off, enter an authenticator code or one backup code.
            </p>
            <input name="code" required maxLength={12} autoComplete="off" className={field} />
            <div>
              <button className="inline-flex h-11 items-center rounded-lg border border-red-300 bg-white px-6 text-sm font-semibold text-red-700 hover:bg-red-50">
                Turn off
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}