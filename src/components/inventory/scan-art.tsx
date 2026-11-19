import { cn } from "@/lib/utils";

// SHUDHU SAJANO: QR + kone-r bracket-er chhobi. Kono data nei.
export function ScanArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("text-blue-500", className)} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 20V12a6 6 0 0 1 6-6h8" />
        <path d="M44 6h8a6 6 0 0 1 6 6v8" />
        <path d="M58 44v8a6 6 0 0 1-6 6h-8" />
        <path d="M20 58h-8a6 6 0 0 1-6-6v-8" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="3">
        <rect x="16" y="16" width="12" height="12" rx="2" />
        <rect x="36" y="16" width="12" height="12" rx="2" />
        <rect x="16" y="36" width="12" height="12" rx="2" />
      </g>
      <g fill="currentColor">
        <rect x="20" y="20" width="4" height="4" rx="1" />
        <rect x="40" y="20" width="4" height="4" rx="1" />
        <rect x="20" y="40" width="4" height="4" rx="1" />
        <rect x="36" y="36" width="5" height="5" rx="1" />
        <rect x="44" y="36" width="4" height="4" rx="1" />
        <rect x="36" y="44" width="4" height="4" rx="1" />
        <rect x="43" y="43" width="5" height="5" rx="1" />
      </g>
    </svg>
  );
}