import { cn } from "@/lib/utils";

// SHUDHU SAJANO: header-er dan-e warehouse-er chhobi. Kono data nei.
export function WarehouseArt({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 130"
      className={cn("w-auto", className)}
      style={{
        maskImage: "linear-gradient(to right, transparent, black 25%)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 25%)",
      }}
    >
      {/* bam-er chhoto box */}
      <rect x="20" y="92" width="34" height="38" rx="3" fill="#bfdbfe" />
      <rect x="58" y="104" width="26" height="26" rx="3" fill="#93c5fd" />

      {/* pichoner building */}
      <rect x="95" y="70" width="60" height="60" fill="#bfdbfe" fillOpacity="0.8" />

      {/* main warehouse */}
      <polygon points="150,62 225,14 300,62" fill="#60a5fa" />
      <rect x="212" y="36" width="26" height="10" rx="2" fill="#dbeafe" />
      <rect x="158" y="60" width="134" height="70" fill="#93c5fd" />
      <rect x="198" y="78" width="54" height="52" rx="3" fill="#1e3a8a" fillOpacity="0.85" />
      <rect x="206" y="108" width="18" height="18" rx="2" fill="#fcd34d" />
      <rect x="228" y="100" width="18" height="26" rx="2" fill="#fbbf24" />

      {/* dan-er box */}
      <rect x="300" y="96" width="30" height="34" rx="3" fill="#bfdbfe" />
      <rect x="334" y="88" width="22" height="42" rx="3" fill="#93c5fd" />

      {/* matir rekha */}
      <rect x="0" y="128" width="360" height="2" fill="#bfdbfe" />
    </svg>
  );
}