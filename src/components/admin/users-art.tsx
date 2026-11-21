import { cn } from "@/lib/utils";

// SHUDHU SAJANO (data nei): header-er shield + lock
export function ShieldArt({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 130" className={cn("w-auto", className)}>
      <path d="M60 8L104 24V62C104 90 84 112 60 122C36 112 16 90 16 62V24Z" fill="#93c5fd" />
      <path d="M60 18L94 30V62C94 84 78 102 60 110C42 102 26 84 26 62V30Z" fill="#3b82f6" />
      <path d="M52 58V50a8 8 0 0 1 16 0v8" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
      <rect x="44" y="56" width="32" height="26" rx="6" fill="#ffffff" />
      <circle cx="60" cy="67" r="4" fill="#2563eb" />
      <rect x="58" y="69" width="4" height="8" rx="2" fill="#2563eb" />
    </svg>
  );
}


// SHUDHU SAJANO (data nei): header-er daane manush-er silhouette
export function PeopleArt({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 300 130" className={cn("w-auto", className)}>
      <g fill="#93c5fd">
        <circle cx="48" cy="42" r="16" />
        <path d="M18 128c0-22 13-38 30-38s30 16 30 38z" />
      </g>
      <g fill="#3b82f6">
        <circle cx="236" cy="40" r="15" />
        <path d="M208 128c0-21 12-36 28-36s28 15 28 36z" />
      </g>
      <g fill="#60a5fa">
        <circle cx="100" cy="30" r="20" />
        <path d="M60 128c0-30 18-50 40-50s40 20 40 50z" />
      </g>
      <g fill="#2563eb">
        <circle cx="172" cy="22" r="23" />
        <path d="M124 128c0-34 22-58 48-58s48 24 48 58z" />
      </g>
    </svg>
  );
}