"use client";

import { useLayoutEffect, useRef } from "react";

const fmt = (n: number, d: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

// "BDT 100.5M" → prefix "BDT ", number 100.5, suffix "M": shudhu number ongsho 0 theke count-up kore.
// Section dekha gele tabe shuru hoy (dashboard-e card-er reveal-er por, onno page-e nijer viewport-e ashle)
export function AnimatedValue({ value, duration = 900 }: { value: string | number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const text = String(value);
  const m = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(\D*)$/.exec(text);
  const pre = m?.[1] ?? "";
  const suf = m?.[3] ?? "";
  const decimals = m?.[2].split(".")[1]?.length ?? 0;
  const target = m ? Number(m[2].replace(/,/g, "")) : 0;

  useLayoutEffect(() => {
    const el = ref.current;
    const node = el?.firstChild;
    if (!el || !node || target === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let startTimer = 0;
    node.nodeValue = `${pre}${fmt(0, decimals)}${suf}`;

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        node.nodeValue = `${pre}${fmt(target * eased, decimals)}${suf}`;
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
        // card-er nijer ure-ashar shesh hole tabe count-up shuru
    const begin = () => {
      const card = el.closest<HTMLElement>(".stagger > *");
      const own = card ? parseFloat(getComputedStyle(card).animationDelay) * 1000 : 0;
      startTimer = window.setTimeout(run, (Number.isFinite(own) ? own : 0) + 500);
    };

    const host = el.closest<HTMLElement>("[data-reveal-root] > *");
    let io: IntersectionObserver | undefined;
    let mo: MutationObserver | undefined;

    if (host) {
      if (host.dataset.inview === "true") begin();
      else {
        mo = new MutationObserver(() => {
          if (host.dataset.inview === "true") {
            mo?.disconnect();
            begin();
          }
        });
        mo.observe(host, { attributes: true, attributeFilter: ["data-inview"] });
      }
    } else {
      io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            io?.disconnect();
            begin();
          }
        },
        { rootMargin: "0px 0px -8% 0px" }
      );
      io.observe(el);
    }

    return () => {
      io?.disconnect();
      mo?.disconnect();
      window.clearTimeout(startTimer);
      cancelAnimationFrame(raf);
      node.nodeValue = text;
    };
  }, [pre, suf, decimals, target, duration, text]);

  return <span ref={ref}>{text}</span>;
}