import Link from "next/link";
import { readResetToken } from "@/lib/reset-token";
import { ResetForm } from "./reset-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const user = await readResetToken(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-denim-800 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-card p-6 shadow-xl">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-wide text-denim-800">
            MERCH<span className="text-gold-500">FLOW</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {user ? `Choose a new password for ${user.email}` : "Reset your password"}
          </p>
        </div>
        {user && token ? (
          <ResetForm token={token} />
        ) : (
          <div className="space-y-3">
            <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              This reset link is invalid or has expired. Links work once and last 1 hour.
            </p>
            <Link href="/forgot-password" className="block text-center text-sm font-medium text-denim-700 hover:underline">
              Request a new link
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
