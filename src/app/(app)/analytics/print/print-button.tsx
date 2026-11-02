"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-100"
    >
      Print / Save as PDF
    </button>
  );
}