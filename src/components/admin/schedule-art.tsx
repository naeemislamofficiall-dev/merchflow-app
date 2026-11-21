import { cn } from "@/lib/utils";

// SHUDHU SAJANO (data nei): header-er daane pata, laptop ar ghori
export function ScheduleArt({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 360 130" className={cn("w-auto", className)}>
      {/* pata */}
      <g fill="#93c5fd">
        <path d="M44 70c-14-8-18-26-10-40 14 6 20 24 10 40z" />
        <path d="M44 70c6-16 20-24 34-22-2 16-16 26-34 22z" />
        <path d="M44 70c-2-20 6-34 20-42 4 16-4 34-20 42z" fill="#60a5fa" />
      </g>
      <rect x="28" y="92" width="32" height="32" rx="6" fill="#3b82f6" />
      {/* laptop */}
      <path d="M96 18h124l10 84H86z" fill="#ffffff" stroke="#2563eb" strokeWidth="4" strokeLinejoin="round" />
      <g fill="#bfdbfe">
        <rect x="108" y="32" width="46" height="5" rx="2.5" />
        <rect x="108" y="44" width="30" height="5" rx="2.5" />
      </g>
      <g fill="#2563eb">
        <rect x="162" y="64" width="12" height="28" rx="2" />
        <rect x="180" y="52" width="12" height="40" rx="2" />
        <rect x="198" y="42" width="12" height="50" rx="2" />
      </g>
      <path d="M72 102h176l-6 14H78z" fill="#2563eb" />
      {/* ghori */}
      <circle cx="288" cy="72" r="46" fill="#ffffff" stroke="#2563eb" strokeWidth="7" />
      <circle cx="288" cy="72" r="36" fill="#dbeafe" />
      <path d="M288 46v28l16 10" fill="none" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// SHUDHU SAJANO: "Create" card-er daane envelope + report + tick
export function MailArt({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 140" className={className}>
      <circle cx="80" cy="72" r="62" fill="#dbeafe" fillOpacity="0.7" />
      <rect x="22" y="60" width="104" height="62" rx="8" fill="#93c5fd" />
      <rect x="40" y="34" width="70" height="60" rx="6" fill="#ffffff" />
      <g fill="#bfdbfe">
        <rect x="50" y="46" width="30" height="5" rx="2.5" />
        <rect x="50" y="58" width="50" height="5" rx="2.5" />
        <rect x="50" y="70" width="40" height="5" rx="2.5" />
      </g>
      <path d="M22 66l52 38a10 10 0 0 0 12 0l40-30v40a8 8 0 0 1-8 8H30a8 8 0 0 1-8-8z" fill="#60a5fa" />
      <circle cx="122" cy="100" r="18" fill="#2563eb" />
      <path d="M113 100l7 7 13-14" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}