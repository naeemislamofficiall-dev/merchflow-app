import { Factory } from "lucide-react";

function dhaka(d: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", ...opts }).format(d);
}

export function DashboardHero({
  name,
  company,
  nowIso,
}: {
  name: string;
  company: string;
  nowIso: string;
}) {
  const now = new Date(nowIso);
  const hour = Number(dhaka(now, { hour: "numeric", hourCycle: "h23" }));
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="relative overflow-hidden rounded-card border bg-card shadow-card">
      {/* ডানদিকের ব্যানার: public/factory-banner.jpg দিলে ছবি আসবে, না দিলে ফাঁকা থাকবে */}
      <div
        className="absolute inset-y-0 right-0 hidden w-1/3 md:block"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-card), transparent 70%), url('/factory.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="relative flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            {greeting}, {name} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Here’s what’s happening in your factory today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-5 md:pr-[34%]">
          <div className="text-right text-sm">
            <p className="font-medium">
              {dhaka(now, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </p>
            <p className="text-xs text-muted-foreground">
              Last updated {dhaka(now, { hour: "2-digit", minute: "2-digit", hour12: true })}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
            <Factory className="h-4 w-4 text-denim-600" />
            <span className="font-medium">{company}</span>
          </div>
        </div>
      </div>
    </div>
  );
}