"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { History, RefreshCw } from "lucide-react";
import { fmtTimeSec } from "@/lib/format";
import type { SyncSource } from "@/lib/types";

const RETRY_MS = 90_000;

/**
 * Eski veri uyarısı. Bir kaynak 3 denemeden sonra da yanıt vermediğinde arayüz boş kalmaz;
 * son başarılı veri sunulur ve bu bant arka planda 90 sn'de bir otomatik yeniden dener.
 */
export function StaleNotice({ sources: initial }: { sources: SyncSource[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sources, setSources] = useState(initial);
  const [retrying, setRetrying] = useState(false);
  const stale = sources.filter((s) => s.stale);

  useEffect(() => setSources(initial), [initial]);

  useEffect(() => {
    if (!stale.length) return;
    const id = setInterval(async () => {
      if (document.hidden || retrying) return;
      setRetrying(true);
      try {
        const res = await fetch("/api/refresh", { method: "POST", cache: "no-store" });
        if (res.ok) {
          const d = (await res.json()) as { sources?: SyncSource[] };
          setSources(d.sources ?? []);
          router.refresh();
        }
      } catch {
        /* bir sonraki turda tekrar */
      } finally {
        setRetrying(false);
      }
    }, RETRY_MS);
    return () => clearInterval(id);
  }, [stale.length, retrying, router, pathname]);

  if (!stale.length) return null;
  const oldest = stale.map((s) => s.staleSince).filter(Boolean).sort()[0];

  return (
    <div role="status" className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs font-semibold text-amber-200">
        <History size={15} className="shrink-0 text-amber-300" />
        <span className="min-w-0 flex-1">
          Canlı veriler güncelleniyor; <b>{stale.map((s) => s.label).join(", ")}</b> için son başarılı veriler gösteriliyor
          {oldest ? <span suppressHydrationWarning> (son başarılı alım: {fmtTimeSec(oldest)} TSİ)</span> : null}.
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-amber-300/80">
          <RefreshCw size={12} className={retrying ? "animate-spin" : ""} />
          {retrying ? "Yeniden deneniyor…" : "90 sn'de bir otomatik denenir"}
        </span>
      </div>
    </div>
  );
}
