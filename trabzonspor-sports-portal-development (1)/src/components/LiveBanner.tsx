"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Fixture } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

/**
 * 30 sn'de bir /api/live yoklar. Canlı maç başlayıp skor/dakika değiştiğinde
 * sessizce güncellenir; maç başlayıp bitince sayfa sunucu verisiyle tazelenir.
 */
export function LiveBanner({ initialId }: { initialId: string | null }) {
  const router = useRouter();
  const idRef = useRef(initialId);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    idRef.current = initialId;
  }, [initialId]);

  useEffect(() => {
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) return;
        const { live } = (await res.json()) as { live: Fixture | null };
        if (live || idRef.current !== null) {
          idRef.current = live?.id ?? null;
          router.refresh();
        }
      } catch {
        /* bir sonraki turda tekrar dene */
      }
    };
    timer.current = setInterval(tick, 30_000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [router]);

  return null;
}

export function LivePill({ live }: { live: Fixture }) {
  return (
    <a
      href="/oynanacak"
      className="flex items-center gap-3 rounded-2xl border border-bordo-300/40 bg-gradient-to-r from-bordo/30 via-bordo/15 to-mavi/10 px-4 py-3 transition-transform hover:scale-[1.01]"
    >
      <span className="flex items-center gap-1.5 rounded-full bg-bordo px-3 py-1">
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-white" />
        <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white">Canlı</span>
      </span>
      <TeamLogo src={live.home.logo} name={live.home.name} size={28} />
      <span className="font-display text-xl tabular-nums text-bone">
        {live.home.score ?? 0} - {live.away.score ?? 0}
      </span>
      <TeamLogo src={live.away.logo} name={live.away.name} size={28} />
      <span className="truncate text-xs font-bold text-muted">
        {live.home.name} - {live.away.name} • {live.clock ?? live.statusText}
      </span>
    </a>
  );
}
