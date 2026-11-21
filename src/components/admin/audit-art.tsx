import { cn } from "@/lib/utils";

// SHUDHU SAJANO (data nei): header-er daane laptop, magnifier ar shield
export function AuditArt({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 130" className={cn("w-auto", className)}>
      {/* laptop */}
      <path d="M78 14h118l10 82H68z" fill="#ffffff" stroke="#2563eb" strokeWidth="4" strokeLinejoin="round" />
      <g fill="#bfdbfe">
        <rect x="90" y="30" width="62" height="5" rx="2.5" />
        <rect x="90" y="44" width="80" height="5" rx="2.5" />
        <rect x="90" y="58" width="52" height="5" rx="2.5" />
        <rect x="90" y="72" width="70" height="5" rx="2.5" />
      </g>
      <path d="M54 96h164l-6 12H60z" fill="#2563eb" />
      {/* magnifier */}
      <circle cx="176" cy="62" r="17" fill="#dbeafe" fillOpacity="0.8" stroke="#2563eb" strokeWidth="4" />
      <path d="M189 75l16 16" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" />
      {/* shield */}
      <path d="M262 14l40 14v32c0 26-18 44-40 54-22-10-40-28-40-54V28z" fill="#93c5fd" />
      <path d="M262 24l30 11v25c0 20-14 34-30 42-16-8-30-22-30-42V35z" fill="#2563eb" />
      <path d="M248 62l10 10 20-22" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}