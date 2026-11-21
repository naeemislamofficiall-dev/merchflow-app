import { cn } from "@/lib/utils";

// SHUDHU SAJANO (data nei): header-er daane jahaj, container ar crane
const BOX_COLORS = ["#2563eb", "#60a5fa", "#93c5fd", "#1d4ed8", "#bfdbfe", "#3b82f6"];
const BOX_ROWS = [86, 70, 54];
const BOX_COLS = [0, 1, 2, 3, 4, 5];

export function ShipArt({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 420 130"
      className={cn("w-auto", className)}
      style={{
        maskImage: "linear-gradient(to right, transparent, black 30%)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 30%)",
      }}
    >
      {/* crane */}
      <g stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M60 128V34" />
        <path d="M100 128V34" />
        <path d="M50 34h130" />
        <path d="M60 34l20-22 20 22" />
        <path d="M160 34v26" />
      </g>
      <rect x="152" y="60" width="16" height="10" rx="2" fill="#2563eb" />

      {/* container-er stack */}
      {BOX_ROWS.map((y, r) =>
        BOX_COLS.map((c) => (
          <rect
            key={`${r}-${c}`}
            x={196 + c * 34}
            y={y}
            width="32"
            height="14"
            rx="1.5"
            fill={BOX_COLORS[(r * 2 + c) % BOX_COLORS.length]}
          />
        ))
      )}

      {/* jahaj-er hull */}
      <path d="M176 100h236l-22 24H196z" fill="#1e3a8a" />
      <rect x="0" y="122" width="420" height="8" fill="#bfdbfe" />
    </svg>
  );
}

// SHUDHU SAJANO: "Add document" card-er daane clipboard
export function ClipboardArt({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 120" className={className}>
      <circle cx="60" cy="62" r="52" fill="#dbeafe" fillOpacity="0.7" />
      <rect x="30" y="20" width="60" height="78" rx="8" fill="#93c5fd" />
      <rect x="36" y="28" width="48" height="64" rx="5" fill="#ffffff" />
      <rect x="48" y="14" width="24" height="12" rx="4" fill="#2563eb" />
      <g fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M42 44l4 4 7-8" />
        <path d="M42 62l4 4 7-8" />
        <path d="M42 80l4 4 7-8" />
      </g>
      <g fill="#93c5fd">
        <rect x="58" y="42" width="20" height="4" rx="2" />
        <rect x="58" y="60" width="20" height="4" rx="2" />
        <rect x="58" y="78" width="14" height="4" rx="2" />
      </g>
      <circle cx="88" cy="88" r="14" fill="#2563eb" />
      <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M88 81v12" />
        <path d="M82 88l6 6 6-6" />
      </g>
    </svg>
  );
}

// SHUDHU SAJANO: empty state-er folder + tick
export function FolderArt({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 96 80" className={className}>
      <path d="M8 22a6 6 0 0 1 6-6h20l8 8h40a6 6 0 0 1 6 6v36a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z" fill="#93c5fd" />
      <rect x="20" y="8" width="44" height="30" rx="3" fill="#ffffff" />
      <g fill="#bfdbfe">
        <rect x="26" y="14" width="24" height="3.5" rx="1.75" />
        <rect x="26" y="22" width="30" height="3.5" rx="1.75" />
      </g>
      <path d="M8 34a6 6 0 0 1 6-6h68a6 6 0 0 1 6 6v30a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z" fill="#60a5fa" />
      <circle cx="72" cy="58" r="13" fill="#2563eb" />
      <path d="M65.5 58.5l4.5 4.5 8-9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}