"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchAction } from "@/app/(app)/actions";

type Hit = { type: string; id: string; label: string; href: string };

// টপবারের গ্লোবাল সার্চ: টাইপ থামার ৩০০ms পরে খোঁজে, বাইরে ক্লিক করলে বন্ধ হয়
export function SearchBox() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0); // পুরনো উত্তর নতুন উত্তরের ওপর বসা ঠেকায়
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // সার্চ চালু হয় টাইপ করার মুহূর্তে (effect-এ নয়), তাই cascading render হয় না
  function onChange(value: string) {
    setQ(value);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);

    const term = value.trim();
    if (term.length < 2) {
      seq.current++; // চলমান সার্চের উত্তর বাতিল
      return;
    }

    const mine = ++seq.current;
    setBusy(true);
    timer.current = setTimeout(async () => {
      const res = await searchAction(term);
      if (mine !== seq.current) return;
      setBusy(false);
      if (res.ok) {
        setHits(res.data);
        setError("");
      } else {
        setHits([]);
        setError(res.error);
      }
    }, 300);
  }

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // ২ অক্ষরের কম হলে আগের ফলাফল দেখানো হয় না (state বদলানো ছাড়াই)
  const active = q.trim().length >= 2;
  const shownHits = active ? hits : [];
  const shownBusy = active && busy;
  const shownError = active ? error : "";

  // ধরন অনুযায়ী সাজানো (Buyer, Order, Style...)
  const types = Array.from(new Set(shownHits.map((h) => h.type)));
  const showPanel = open && active;

  return (
    <div ref={boxRef} className="relative hidden w-72 sm:block">
      <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="Search buyer, order, style, PO..."
        className="h-8 w-full rounded-md border bg-card pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-denim-200"
        aria-label="Global search"
      />

      {showPanel && (
        <div className="absolute left-0 top-10 z-30 max-h-96 w-full min-w-80 overflow-y-auto rounded-md border bg-card shadow-lg">
          {shownBusy && shownHits.length === 0 && <p className="p-3 text-sm text-muted-foreground">Searching...</p>}
          {shownError && <p className="p-3 text-sm text-destructive">{shownError}</p>}
          {!shownBusy && !shownError && shownHits.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No results for “{q.trim()}”</p>
          )}
          {types.map((type) => (
            <div key={type}>
              <p className="bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {type}
              </p>
              <ul>
                {shownHits
                  .filter((h) => h.type === type)
                  .map((h) => (
                    <li key={`${h.type}:${h.id}`}>
                      <Link
                        href={h.href}
                        onClick={() => setOpen(false)}
                        className="block px-3 py-1.5 text-sm hover:bg-muted"
                      >
                        {h.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}