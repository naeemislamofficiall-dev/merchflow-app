"use client";

import { useEffect } from "react";

// Dashboard-er prottek direct child (section) viewport-e ashle tabe animate hoy
export function RevealObserver() {
  useEffect(() => {
    const root = document.querySelector("[data-reveal-root]");
    if (!root) return;
    const items = Array.from(root.children) as HTMLElement[];

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      items.forEach((el) => {
        el.dataset.inview = "true";
      });
      return;
    }

    let batch = 0;
    let resetTimer: number | undefined;
    const timeouts: number[] = [];

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          io.unobserve(el);
          // ek-i shomoy ekaadhik section dekha gele ekta ekta kore
          timeouts.push(
            window.setTimeout(() => {
              el.dataset.inview = "true";
            }, batch++ * 200)
          );
        }
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(() => {
          batch = 0;
        }, 120);
      },
      { rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      window.clearTimeout(resetTimer);
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return null;
}