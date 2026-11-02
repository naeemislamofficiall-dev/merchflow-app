import type { ReactNode } from "react";

export const inputCls = "w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm";

export function F({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-gray-600">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="mb-4 text-xl font-semibold text-gray-900">{children}</h1>;
}

export function Pill({ text }: { text: string }) {
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{text.replace(/_/g, " ")}</span>;
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
      {title && <h2 className="mb-3 text-sm font-semibold text-gray-800">{title}</h2>}
      {children}
    </section>
  );
}

export const fmt = (v: unknown) => Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 });

export const th = "px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500";
export const td = "px-3 py-2 text-sm text-gray-800";