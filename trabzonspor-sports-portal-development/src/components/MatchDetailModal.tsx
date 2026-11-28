"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import type { Fixture, MatchEvent } from "@/lib/types";
import type { MatchDetail, MatchPlayerFull } from "@/lib/espn";
import { TeamLogo } from "./TeamLogo";
import { TvBadge } from "./TvBadge";
import { PhotoPitch } from "./PhotoPitch";
import { PlayerModal } from "./PlayerModal";

interface Detail {
  fixture: Fixture;
  tsLineup: { formation: string | null; starters: MatchPlayerFull[]; subs: MatchPlayerFull[] } | null;
  keyEvents: MatchEvent[];
}

const LIVE_POLL_MS = 15_000;

/**
 * Tek maç penceresi (canlı ve oynanmış): skor + yayıncı kanalı, Trabzonspor'un sahadaki 11'i
 * (fotoğraf, forma no, ad, maç reytingi) ve Türkçe maç olayları. Canlı maçta 15 sn'de bir yenilenir.
 */
export function MatchDetailModal({ fixture, onClose }: { fixture: Fixture; onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const endedRef = useRef(false);

  const load = useCallback(async () => {
    const live = fixture.state === "in";
    const url = live ? `/api/live?event=${encodeURIComponent(fixture.id)}` : `/api/match?event=${encodeURIComponent(fixture.id)}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as Detail & { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) throw new Error(json.error ?? "Maç verisi alınamadı");
      setData(json);
      setError(null);
      if (live && json.fixture.state === "post" && !endedRef.current) {
        endedRef.current = true;
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Maç verisi alınamadı");
    }
  }, [fixture.id, fixture.state, router]);

  useEffect(() => {
    void load();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [load, onClose]);

  useEffect(() => {
    if (fixture.state !== "in" || data?.fixture.state === "post") return;
    const id = setInterval(() => {
      if (!document.hidden) void load();
    }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [fixture.state, data?.fixture.state, load]);

  const fx = data?.fixture ?? fixture;
  const live = fx.state === "in";
  const ended = fx.state === "post";
  const starters = data?.tsLineup?.starters ?? [];
  const events = live ? [...(data?.keyEvents ?? [])].reverse() : (data?.keyEvents ?? []);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink-950/85 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={live ? "Canlı Maç Merkezi" : "Maç detayı"}
    >
      <div className="glass relative max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className={`absolute inset-x-0 top-0 h-1 ${live ? "animate-pulse bg-bordo-300" : "bg-gradient-to-r from-bordo via-bordo-400 to-mavi"}`} />
        <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-ink-950/70 p-2 text-muted hover:text-bone" aria-label="Kapat">
          <X size={18} />
        </button>

        <div className="p-5 sm:p-7">
          {/* Durum + yayıncı */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest">
            {live ? (
              <span className="flex items-center gap-1.5 rounded-full bg-[#d81e3f] px-3 py-1 text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Canlı
              </span>
            ) : (
              <span className="rounded-full bg-white/10 px-3 py-1 text-muted">{ended ? "Maç Sonu" : "Oynanacak"}</span>
            )}
            <span className="truncate text-mavi-200">{fx.competition}</span>
            <span className="ml-auto"><TvBadge tv={fx.tv} /></span>
          </div>

          {/* Skor */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              <TeamLogo src={fx.home.logo} name={fx.home.name} size={54} />
              <span className="text-sm font-bold leading-tight text-bone">{fx.home.name}</span>
            </div>
            <div className="flex shrink-0 flex-col items-center px-2">
              <span className="font-display text-5xl leading-none text-bone tabular-nums">
                {fx.home.score ?? 0}<span className="mx-1.5 text-muted">-</span>{fx.away.score ?? 0}
              </span>
              <span className="mt-2 flex items-center gap-1.5 rounded-full bg-bordo/30 px-3 py-1 text-[11px] font-extrabold uppercase text-bordo-300">
                {fx.clock ? <span className="tabular-nums">{fx.clock}</span> : null}
                <span>{fx.phase}</span>
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              <TeamLogo src={fx.away.logo} name={fx.away.name} size={54} />
              <span className="text-sm font-bold leading-tight text-bone">{fx.away.name}</span>
            </div>
          </div>

          {error ? (
            <p role="alert" className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] font-semibold text-amber-200">
              {error} — son başarılı veri korunuyor.
            </p>
          ) : null}

          {!data && !error ? (
            <div className="flex items-center justify-center gap-2.5 py-10">
              <Loader2 size={18} className="animate-spin text-mavi" />
              <span className="text-xs font-bold uppercase tracking-widest text-muted">Maç verisi yükleniyor…</span>
            </div>
          ) : (
            <>
              {/* Trabzonspor saha dizilişi — oyuncular ve maç reytingleri */}
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-display text-xs uppercase tracking-[0.2em] text-mavi">Trabzonspor ilk 11</p>
                {data?.tsLineup?.formation ? (
                  <span className="rounded-full border border-mavi/30 bg-mavi/10 px-2.5 py-0.5 font-display text-xs text-mavi-200">{data.tsLineup.formation}</span>
                ) : null}
              </div>
              {starters.length ? (
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <PhotoPitch formation={data?.tsLineup?.formation ?? null} starters={starters} onPlayer={setPlayerId} />
                </div>
              ) : (
                <p className="rounded-2xl border border-white/8 bg-ink-950/60 p-4 text-center text-xs text-muted">
                  {ended ? "Bu maçın resmî kadro verisi bulunamadı." : "Resmî ilk 11 henüz açıklanmadı; açıklandığında burada görünür."}
                </p>
              )}

              {/* Maç olayları */}
              <p className="mb-2 mt-5 font-display text-xs uppercase tracking-[0.2em] text-mavi">
                {live ? "Canlı akış" : "Maç olayları"}
              </p>
              {events.length ? (
                <ol className="flex max-h-64 flex-col gap-1.5 overflow-y-auto rounded-2xl border border-white/8 bg-ink-950/60 p-3">
                  {events.map((k, i) => (
                    <li key={`${k.minute}-${i}`} className="flex items-start gap-2.5 text-[12px]">
                      <span className={`w-10 shrink-0 text-right font-display tabular-nums ${k.isGoal ? "text-emerald-400" : "text-muted"}`}>{k.minute}</span>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${k.isGoal ? "bg-emerald-500/15 text-emerald-300" : k.label.includes("Kart") ? "bg-amber-500/15 text-amber-300" : "bg-white/[0.05] text-muted"}`}>
                        {k.label}
                      </span>
                      <span className={`font-semibold ${k.isGoal ? "text-emerald-300" : "text-bone/85"}`}>{k.text}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="rounded-2xl border border-white/8 bg-ink-950/60 p-4 text-center text-[11px] text-muted">
                  {live ? "Henüz olay yok." : "Bu maç için olay kaydı yok."}
                </p>
              )}

              {ended && endedRef.current ? (
                <p className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-[11px] font-semibold text-emerald-200">
                  Maç sona erdi; sonuç ve reytingler Oynanmış Maçlar sekmesine işlendi.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
      {playerId ? <PlayerModal id={playerId} onClose={() => setPlayerId(null)} /> : null}
    </div>
  );
}
