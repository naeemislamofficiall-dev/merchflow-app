import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const type = session?.user?.portalType;
  if (!type) redirect("/login");

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <div className="font-semibold">
          MERCHFLOW {type === "SUPPLIER" ? "Supplier" : "Buyer"} Portal
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">{session?.user?.email}</span>
          <form action={logout}>
            <button type="submit" className="rounded border px-3 py-1 hover:bg-gray-100">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}