"use client";

import { createElement, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavGroupData, NavItem } from "./nav-config";
import { iconFor } from "./nav-icons";

const PIN_TOP = "/dashboard";
const PIN_BOTTOM = "/analytics";

function NavLink({
  item,
  active,
  onClose,
  label,
  trailing,
}: {
  item: NavItem;
  active: boolean;
  onClose: () => void;
  label?: string;
  trailing?: boolean;
}) {
  
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
        active
          ? "bg-blue-600 font-medium text-white shadow-lg shadow-blue-950/50"
          : "text-slate-200 hover:translate-x-0.5 hover:bg-white/10 hover:text-white"
      )}
    >
      {createElement(iconFor(item.href), {
        className: cn(
          "h-4.5 w-4.5 shrink-0 motion-safe:group-hover:animate-icon-wiggle",
          active ? "text-white" : "text-sky-300"
        ),
      })}
      <span className="truncate">{label ?? item.label}</span>
      {trailing && (
        <ChevronRight className="ml-auto h-4 w-4 opacity-70 transition-transform duration-200 group-hover:translate-x-1" />
      )}
    </Link>
  );
}

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

  const readyItems = groups.flatMap((g) => g.items.filter((i) => i.ready));
  const top = readyItems.find((i) => i.href === PIN_TOP);
  const bottom = readyItems.find((i) => i.href === PIN_BOTTOM);

  // Dashboard ar Analytics group theke bad (alada pin kora), "soon" item-o bad
  const visible = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => i.ready && i.href !== PIN_TOP && i.href !== PIN_BOTTOM),
    }))
    .filter((g) => g.items.length > 0);

  // shobcheye lomba match-kora href-i active (orders vs orders/amendments)
  const activeHref = readyItems
    .map((i) => i.href)
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];

  const activeGroup = visible.find((g) => g.items.some((i) => i.href === activeHref))?.label;

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(visible.map((g) => g.label)));

  // page change hole oi page-er group auto-open
  const [prevActive, setPrevActive] = useState(activeGroup);
  if (activeGroup !== prevActive) {
    setPrevActive(activeGroup);
    if (activeGroup) setOpenGroups((p) => new Set(p).add(activeGroup));
  }

  function toggle(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <>
      {/* মোবাইলে মেনু খুললে পেছনের ঝাপসা অংশ */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-linear-to-b from-navy-800 to-navy-950 text-slate-200 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-sky-400 to-blue-600 font-heading text-lg font-bold text-white shadow-lg shadow-blue-950/50">
              M
            </span>
            <div className="leading-tight">
              <p className="font-heading text-base font-bold tracking-wide text-white">
                MERCH<span className="text-sky-300">FLOW</span>
              </p>
              <p className="text-[10px] text-slate-300/80">Garments &amp; Textile ERP</p>
            </div>
          </div>
          <button className="md:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dashboard: alada pin */}
        {top && (
          <div className="shrink-0 px-3 pb-2 pt-1">
            <NavLink item={top} active={top.href === activeHref} onClose={onClose} />
          </div>
        )}

        {/* Groups */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-1">
          {visible.map((g) => {
            const isOpen = openGroups.has(g.label);
            return (
              <div key={g.label}>
                <button
                  type="button"
                  onClick={() => toggle(g.label)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-sky-300/80 transition-colors hover:text-white"
                >
                  {g.label}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                </button>
                
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <ul className="min-h-0 space-y-0.5 overflow-hidden" inert={!isOpen}>
                    {g.items.map((item) => (
                      <li key={item.href}>
                        <NavLink item={item} active={item.href === activeHref} onClose={onClose} />
                      </li>
                    ))}
                    <li aria-hidden="true" className="h-2" />
                  </ul>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Reports & Analytics: niche pin */}
        {bottom && (
          <div className="shrink-0 border-t border-white/10 p-3">
            <NavLink
              item={bottom}
              active={bottom.href === activeHref}
              onClose={onClose}
              label="Reports & Analytics"
              trailing
            />
          </div>
        )}
      </aside>
    </>
  );
}