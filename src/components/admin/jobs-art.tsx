import { cn } from "@/lib/utils";

// SHUDHU SAJANO (data nei): server stack ar ghori
export function JobsArt({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 180 130" className={cn("w-auto", className)}>
      <g>
        <rect x="16" y="14" width="104" height="26" rx="6" fill="#2563eb" />
        <rect x="16" y="46" width="104" height="26" rx="6" fill="#3b82f6" />
        <rect x="16" y="78" width="104" height="26" rx="6" fill="#60a5fa" />
        <g fill="#bfdbfe">
          <circle cx="30" cy="27" r="3" />
          <circle cx="42" cy="27" r="3" />
          <circle cx="30" cy="59" r="3" />
          <circle cx="42" cy="59" r="3" />
          <circle cx="30" cy="91" r="3" />
          <circle cx="42" cy="91" r="3" />
        </g>
      </g>
      <circle cx="122" cy="92" r="32" fill="#ffffff" stroke="#2563eb" strokeWidth="6" />
      <circle cx="122" cy="92" r="24" fill="#dbeafe" />
      <path d="M122 76v17l11 7" fill="none" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}