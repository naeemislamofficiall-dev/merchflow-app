import { Ruler, Scissors, Shirt } from "lucide-react";

function NeedleLoader() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden="true">
      {/* presser foot */}
      <rect x="42" y="74" width="36" height="7" rx="3.5" fill="#94a3b8" />

      {/* needle + suto: upor-niche */}
      <g className="animate-needle motion-reduce:animate-none">
        <rect x="54" y="4" width="12" height="14" rx="3" fill="#334155" />
        <line x1="60" y1="18" x2="60" y2="62" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
        <path d="M57.5 62 L62.5 62 L60 76 Z" fill="#334155" />
        <circle cx="60" cy="58" r="1.4" fill="#fff" />
        <path
          d="M60 58 C 50 42, 42 26, 34 6"
          fill="none"
          stroke="#dcb73f"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>

      {/* kapor */}
      <rect x="8" y="86" width="104" height="18" rx="5" fill="#3a6396" />
      <rect x="8" y="86" width="104" height="6" rx="3" fill="#fff" fillOpacity="0.22" />

      {/* stitch */}
      <line
        x1="16"
        y1="96"
        x2="104"
        y2="96"
        stroke="#dcb73f"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="8 7"
        className="animate-stitch motion-reduce:animate-none"
      />
    </svg>
  );
}

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-loader-in fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-md"
    >
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/60 bg-white/60 px-12 py-8 shadow-2xl shadow-denim-900/10 backdrop-blur-xl">
        <NeedleLoader />

        <div className="flex items-center gap-5 text-denim-600">
          <Scissors
            className="h-5 w-5 animate-loader-pulse motion-reduce:animate-none"
            style={{ animationDelay: "0s" }}
          />
          <Shirt
            className="h-5 w-5 animate-loader-pulse motion-reduce:animate-none"
            style={{ animationDelay: "0.25s" }}
          />
          <Ruler
            className="h-5 w-5 animate-loader-pulse motion-reduce:animate-none"
            style={{ animationDelay: "0.5s" }}
          />
        </div>

        <p className="text-sm font-medium text-denim-700">Loading…</p>
      </div>
    </div>
  );
}