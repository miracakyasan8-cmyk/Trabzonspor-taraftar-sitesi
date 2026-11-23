"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, ShieldCheck, X } from "lucide-react";
import type { PlayerDetail } from "@/lib/players";
import { POSITION_TR } from "@/lib/labels";
import { fmtDateFull } from "@/lib/format";
import { MARKET_SOURCE } from "@/lib/market";

const SEASON_LABEL = (() => {
  const y = new Date().getFullYear();
  return `${y}-${String(y + 1).slice(2)} sezonu`;
})();

/**
 * Resmî kulüp fotoğrafı + yalnızca Trabzonspor formasıyla elde edilmiş
 * sezon istatistikleri ve doğrulanmış Transfermarkt profil bağlantısı.
 */
export function PlayerModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [detail, setDetail] = useState<PlayerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedPhoto, setFailedPhoto] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    let dead = false;
    fetch(`/api/player?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Oyuncu bilgisi alınamadı");
        return (await r.json()) as PlayerDetail;
      })
      .then((d) => !dead && setDetail(d))
      .catch((e: unknown) => !dead && setError(e instanceof Error ? e.message : "Oyuncu bilgisi alınamadı"));
    return () => { dead = true; };
  }, [id]);

  const s = detail?.stats;
  const cells = s
    ? [
        { v: s.appearances, l: "Maç" },
        { v: s.starts, l: "İlk 11" },
        { v: s.minutes, l: "Dakika" },
        { v: s.goals, l: "Gol" },
        { v: s.assists, l: "Asist" },
        { v: s.yellow, l: "Sarı Kart" },
        { v: s.red, l: "Kırmızı Kart" },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink-950/85 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label="Oyuncu profili">
      <div className="glass relative max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-bordo via-bordo-400 to-mavi" />
        <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-ink-950/70 p-2 text-muted transition-colors hover:text-bone" aria-label="Kapat">
          <X size={18} />
        </button>

        {!detail && !error ? (
          <div className="flex flex-col items-center gap-3 p-14">
            <Loader2 size={26} className="animate-spin text-mavi" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted">Resmî profil yükleniyor…</p>
          </div>
        ) : error || !detail ? (
          <p className="p-10 text-center text-sm text-muted">{error ?? "Oyuncu bulunamadı."}</p>
        ) : (
          <>
            <div className="relative overflow-hidden px-6 pb-5 pt-7">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-bordo/30 blur-[70px]" />
              <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:text-left">
                <span className="relative block h-40 w-32 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-ink-800 sm:h-48 sm:w-40">
                  {detail.photo && !failedPhoto ? (
                    <Image src={detail.photo} alt={detail.player.name} fill sizes="160px" className="object-contain object-bottom" onError={() => setFailedPhoto(true)} />
                  ) : (
                    <span className="flex h-full items-center justify-center font-display text-5xl text-white/60">{detail.player.jersey ?? "—"}</span>
                  )}
                </span>
                <div className="min-w-0 pb-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-mavi">
                    {POSITION_TR[detail.player.position]} • #{detail.player.jersey ?? "—"}
                  </p>
                  <h3 className="font-display text-3xl uppercase leading-none text-bone sm:text-4xl">{detail.player.name}</h3>
                  <p className="mt-2 text-xs font-semibold text-muted">
                    {[detail.player.nationality, detail.player.age ? `${detail.player.age} yaş` : null].filter(Boolean).join(" • ")}
                  </p>
                  {detail.player.isNew ? (
                    <span className="mt-2 inline-flex items-center rounded-full bg-mavi/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-mavi">Yeni Transfer</span>
                  ) : null}
                  <a href={detail.player.officialUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-mavi">
                    Resmî kulüp profili <ExternalLink size={11} />
                  </a>
                  {detail.player.photoUpdatedAt ? (
                    <p className="mt-1 text-[10px] font-semibold text-muted" suppressHydrationWarning>
                      Resmî fotoğraf kontrolü: {fmtDateFull(detail.player.photoUpdatedAt)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Oyuncu detayları: doğum tarihi/yaş, boy, ayak, sözleşme, piyasa değeri */}
            <div className="px-6 pb-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-mavi">Oyuncu Bilgileri</p>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { k: "Doğum Tarihi", v: detail.player.birthDate ? `${fmtDateFull(detail.player.birthDate)}${detail.player.age ? ` (${detail.player.age})` : ""}` : null },
                  { k: "Boy", v: detail.player.height },
                  { k: "Ayak", v: detail.player.foot },
                  { k: "Katılış", v: detail.player.joined ? fmtDateFull(detail.player.joined) : null },
                  { k: "Sözleşme Bitişi", v: detail.player.contractUntil ? fmtDateFull(detail.player.contractUntil) : null },
                  { k: "Piyasa Değeri", v: detail.player.marketValue, strong: true },
                ]
                  .filter((row) => row.v)
                  .map((row) => (
                    <div key={row.k} className="rounded-xl border border-white/8 bg-ink-950/60 px-3 py-2">
                      <dt className="text-[9px] font-bold uppercase tracking-wider text-muted">{row.k}</dt>
                      <dd className={`mt-0.5 text-[12px] font-bold ${row.strong ? "text-mavi-200" : "text-bone"}`} suppressHydrationWarning>{row.v}</dd>
                    </div>
                  ))}
              </dl>
              {detail.player.marketValue ? (
                <p className="mt-2 text-[10px] font-semibold text-muted">
                  Piyasa değeri kaynağı:{" "}
                  <a href={MARKET_SOURCE.url} target="_blank" rel="noopener noreferrer" className="text-mavi hover:text-mavi-200">{MARKET_SOURCE.name}</a>
                  {" "}— her yenilemede güncellenir.
                </p>
              ) : null}
            </div>

            <div className="px-6 pb-5">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.28em] text-mavi">
                Yalnızca Trabzonspor istatistikleri
              </p>
              <p className="mb-3 text-[10px] font-semibold text-muted">{detail.statsCompetition} • {SEASON_LABEL} • resmî maçlar</p>
              {detail.stats ? (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {cells.map((c) => (
                    <div key={c.l} className="rounded-xl border border-white/8 bg-ink-950/60 px-1 py-2.5 text-center">
                      <p className="font-display text-xl leading-none text-bone tabular-nums">{c.v ?? "—"}</p>
                      <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-muted">{c.l}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-white/8 bg-ink-950/60 p-4 text-center text-xs font-semibold text-muted">
                  {detail.statsError}
                </p>
              )}
              <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-muted">
                <ShieldCheck size={11} className="text-mavi" /> Kaynaklar: Trabzonspor Kulübü • ESPN
              </p>
            </div>

            <div className="border-t border-white/8 p-6 pt-5">
              <a href={detail.tmUrl} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-mavi-600 to-mavi px-6 py-3.5 text-sm font-extrabold text-ink-950 transition-transform hover:scale-[1.02]">
                Transfermarkt Profilini Aç <ExternalLink size={16} />
              </a>
              <p className="mt-2 text-center text-[10px] font-semibold text-muted">
                {detail.tmExact ? "Doğrulanmış profil yeni sekmede açılır." : "Doğrulanmış profil bulunamadı; Transfermarkt araması açılır."}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
