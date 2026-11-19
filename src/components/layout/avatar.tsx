import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

// gol profile chhobi; chhobi na thakle nam-er prothom okkhor
export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={cn("h-10 w-10 shrink-0 rounded-full object-cover shadow ring-2 ring-white", className)}
    />
  ) : (
    <span
      aria-label={name}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-sky-400 text-sm font-semibold text-white shadow ring-2 ring-white",
        className
      )}
    >
      {initials(name)}
    </span>
  );
}