"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavGroupData } from "./nav-config";

export function Sidebar({
  groups,
  open,
  onClose,
}: {
  groups: NavGroupData[];
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* মোবাইলে মেনু খুললে পেছনের ঝাপসা অংশ */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto bg-denim-800 text-denim-100 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <span className="font-heading text-lg font-bold tracking-wide text-white">
            MERCH<span className="text-gold-400">FLOW</span>
          </span>
          <button className="md:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-5 px-2 pb-8 pt-2">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-denim-200/70">
                {g.label}
              </p>
              <ul className="space-y-0.5">
                {g.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      {item.ready ? (
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "block rounded-md px-3 py-1.5 text-sm transition-colors",
                            active
                              ? "bg-denim-900 font-medium text-white"
                              : "hover:bg-denim-700 hover:text-white"
                          )}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm text-denim-200/40">
                          {item.label}
                          <span className="text-[10px] uppercase">soon</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}