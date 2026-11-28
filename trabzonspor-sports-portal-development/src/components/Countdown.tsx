"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");

/** Maç saatine kalan süre — istemcide saniye saniye işler. */
export function Countdown({ target }: { target: string }) {
  const [mounted, setMounted] = useState(false);
  const [diff, setDiff] = useState(0);

  useEffect(() => {
    setMounted(true);
    const tick = () => setDiff(new Date(target).getTime() - Date.now());
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [target]);

  if (mounted && diff <= 0) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-mavi/30 bg-mavi/10 px-6 py-4">
        <span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-mavi" />
        <span className="font-display text-lg uppercase tracking-widest text-mavi">
          Maç saati geldi — skor birazdan
        </span>
      </div>
    );
  }

  const total = Math.max(0, Math.floor(diff / 1000));
  const cells = [
    { v: Math.floor(total / 86400), l: "Gün" },
    { v: Math.floor((total % 86400) / 3600), l: "Saat" },
    { v: Math.floor((total % 3600) / 60), l: "Dakika" },
    { v: total % 60, l: "Saniye" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {cells.map((c) => (
        <div
          key={c.l}
          className="rounded-xl border border-white/10 bg-ink-950/70 px-2 py-3 text-center backdrop-blur-sm"
        >
          <div className="font-display text-2xl leading-none text-bone tabular-nums sm:text-4xl">
            {mounted ? pad(c.v) : "--"}
          </div>
          <div className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.25em] text-muted">{c.l}</div>
        </div>
      ))}
    </div>
  );
}
