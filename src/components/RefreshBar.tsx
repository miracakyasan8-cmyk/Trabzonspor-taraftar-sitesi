"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Globe, History, RefreshCw, TriangleAlert, XCircle } from "lucide-react";
import { fmtTimeSec } from "@/lib/format";
import type { PortalData, SectionKey, SyncSource } from "@/lib/types";

const KEYS: SectionKey[] = ["fixtures", "standings", "squad", "news", "social", "store"];
const LABELS: Partial<Record<SectionKey, string>> = {
  fixtures: "Maçlar", standings: "Puan durumu", squad: "Kadro", news: "Haberler", social: "Sosyal medya", store: "TS Store",
};

export function RefreshBar({ initialUpdatedAt }: { initialUpdatedAt: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRun, setLastRun] = useState<{ ok: number; ms: number; failed: string[] } | null>(null);
  const [netError, setNetError] = useState<string | null>(null);
  const [sources, setSources] = useState<SyncSource[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/meta", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { updatedAt: string | null; sources?: SyncSource[] }) => {
        if (!active) return;
        if (data.updatedAt) setUpdatedAt(data.updatedAt);
        if (data.sources?.length) setSources(data.sources);
      }).catch(() => {});
    return () => { active = false; };
  }, [pathname, initialUpdatedAt]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setNetError(null);
    try {
      const response = await fetch("/api/refresh", { method: "POST", cache: "no-store" });
      if (!response.ok) throw new Error(`Sunucu ${response.status} döndürdü`);
      const data = await response.json() as PortalData;
      const failed = KEYS.filter((key) => Boolean(data.errors[key]));
      const staleCount = data.staleCount ?? 0;
      if (staleCount) setNetError(`${staleCount} kaynak canlı yanıt vermedi; son başarılı veriler korunuyor ve arka planda yeniden denenecek.`);
      setUpdatedAt(data.updatedAt);
      setSources(data.sources ?? []);
      setOpen(true);
      setLastRun({ ok: KEYS.length - failed.length, ms: data.durationMs, failed: failed.map((key) => LABELS[key] ?? key) });
      router.refresh();
    } catch (error) {
      setNetError(`Yenileme başarısız: ${error instanceof Error ? error.message : "bağlantı hatası"}. Tekrar deneyebilirsin.`);
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  return (
    <div className="sync-bar sticky top-16 z-40 border-y border-white/8 bg-ink-900/90 backdrop-blur-md">
      {refreshing ? <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-white/5"><div className="skeleton h-full w-full" /></div> : null}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[9px] font-bold uppercase tracking-[0.23em] text-muted sm:text-[10px]">Son Güncelleme <span className="text-muted/55">• TSİ</span></p>
          <div className="mt-0.5 flex items-center gap-2 sm:gap-3">
            <time dateTime={updatedAt ?? undefined} suppressHydrationWarning className={`font-display text-lg tracking-wider text-bone tabular-nums sm:text-xl ${refreshing ? "opacity-40" : ""}`}>{updatedAt ? fmtTimeSec(updatedAt) : "Bağlanıyor…"}</time>
            {refreshing ? (
              <span role="status" className="hidden truncate text-[11px] font-semibold text-mavi sm:block">TS Store dâhil tüm kaynaklar yenileniyor…</span>
            ) : lastRun ? (
              <span title={lastRun.failed.length ? `Alınamayan kaynaklar: ${lastRun.failed.join(", ")}` : "TS Store dâhil tüm kaynaklar yeniden okundu"} className={`flex shrink-0 items-center gap-1 text-[10px] font-semibold sm:text-xs ${lastRun.ok === KEYS.length ? "text-emerald-400" : "text-amber-400"}`}>
                {lastRun.ok === KEYS.length ? <CheckCircle2 size={12} /> : <TriangleAlert size={12} />}
                {lastRun.ok}/{KEYS.length}<span className="hidden sm:inline">kaynak • {(lastRun.ms / 1000).toFixed(1)} sn</span>
              </span>
            ) : null}
          </div>
        </div>
        {sources.length ? (
          <div className="relative hidden shrink-0 sm:block">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-[11px] font-bold text-muted transition-colors hover:border-mavi/40 hover:text-bone"
            >
              <Globe size={13} className="text-mavi" /> Kaynak raporu <ChevronDown size={13} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
            {open ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-[380px] rounded-2xl border border-white/10 bg-ink-900/98 p-4 shadow-2xl backdrop-blur-md">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-mavi">Son senkronizasyonda taranan kaynaklar</p>
                <ul className="flex flex-col gap-2.5">
                  {sources.map((src) => (
                    <li key={src.key} className="flex items-start gap-2.5">
                      {src.stale ? <History size={14} className="mt-0.5 shrink-0 text-amber-300" /> : src.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" /> : <XCircle size={14} className="mt-0.5 shrink-0 text-bordo-300" />}
                      <span className="min-w-0">
                        <span className="block text-[12px] font-bold text-bone">{src.label}</span>
                        <span className="block text-[10px] font-semibold text-muted">{src.source}</span>
                        <span className={`block text-[10px] font-semibold ${src.stale ? "text-amber-200" : src.ok ? "text-mavi-200" : "text-bordo-300"}`}>
                          {src.detail}{src.stale ? " • canlı kaynak yanıt vermedi, son başarılı veri korunuyor" : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-white/8 pt-3 text-[10px] leading-relaxed text-muted">
                  Her kaynak için 3 deneme yapılır; yanıt gelmezse son başarılı veri korunur ve 90 sn&apos;de bir yeniden denenir. Maçkolik sunucu taramasına izin vermediği için yalnızca bağlantı olarak sunulur. Her gece 00:00 TSİ&apos;de ve bu butonla tüm kaynaklar önbellek sıfırlanarak yeniden okunur.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        <button onClick={() => void refresh()} disabled={refreshing} className="group relative flex shrink-0 items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-bordo via-bordo-400 to-mavi-600 px-4 py-2.5 text-[11px] font-extrabold text-white shadow-[0_8px_30px_-8px_rgba(138,21,56,0.9)] ring-1 ring-white/15 transition-all hover:brightness-110 disabled:cursor-wait disabled:opacity-75 sm:gap-2.5 sm:px-6 sm:text-sm">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : "transition-transform duration-500 group-hover:rotate-180"} />
          {refreshing ? "Yenileniyor…" : "Verileri Yenile"}
        </button>
      </div>
      {netError ? <p role="alert" className={`absolute inset-x-3 top-full mt-2 rounded-xl border bg-ink-900 px-4 py-3 text-center text-xs font-semibold shadow-xl ${netError.startsWith("Yenileme başarısız") ? "border-bordo/40 text-bordo-300" : "border-amber-400/40 text-amber-200"}`}>{netError}</p> : null}
    </div>
  );
}
