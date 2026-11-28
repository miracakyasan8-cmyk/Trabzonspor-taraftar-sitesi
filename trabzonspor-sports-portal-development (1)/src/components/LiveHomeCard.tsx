"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarDays, MapPin, Radio } from "lucide-react";
import type { Fixture, LiveVerification } from "@/lib/types";
import { fmtDateLong, fmtTime } from "@/lib/format";
import { Countdown } from "./Countdown";
import { TeamLogo } from "./TeamLogo";
import { TvBadge } from "./TvBadge";
import { MatchDetailModal } from "./MatchDetailModal";

const POLL_MS = 15_000;

function Team({ side }: { side: Fixture["home"] }) {
  return (
    <div className="home-team flex min-w-0 flex-1 flex-col items-center text-center">
      <TeamLogo src={side.logo} name={side.name} size={80} />
      <span className="home-team-name font-bold leading-tight text-bone">{side.name}</span>
    </div>
  );
}

/**
 * Ana sayfa maç kartı. Maç başladığında geri sayım otomatik olarak CANLI moda geçer:
 * yanıp sönen kırmızı rozet, anlık skor, dakika ve faz (İlk Yarı / Devre Arası / 90+3').
 * Karta dokununca Canlı Maç Merkezi açılır. Maç bitince kart sıradaki maça döner ve
 * sayfa sunucu verisiyle tazelenir (sonuç Oynanmış Maçlar'a işlenir).
 */
export function LiveHomeCard({
  initialLive,
  initialNext,
}: {
  initialLive: Fixture | null;
  initialNext: Fixture | null;
}) {
  const router = useRouter();
  const [live, setLive] = useState<Fixture | null>(initialLive);
  const [next, setNext] = useState<Fixture | null>(initialNext);
  const [verification, setVerification] = useState<LiveVerification | null>(null);
  const [open, setOpen] = useState(false);
  const [centerFixture, setCenterFixture] = useState<Fixture | null>(initialLive);
  const previousLiveId = useRef<string | null>(initialLive?.id ?? null);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          live: Fixture | null;
          verification: LiveVerification | null;
        };
        if (!active) return;
        const previous = previousLiveId.current;
        const current = json.live?.id ?? null;
        setLive(json.live);
        setVerification(json.verification);
        previousLiveId.current = current;
        if (current && current !== previous) {
          // Maç başladı → kart CANLI moda geçer; pencere yalnızca tıklanınca açılır
          setLive(json.live);
        }
        if (!current && previous) {
          // Maç bitti → pencere açık kalır (maç sonu özeti), ana sayfa arşive göre tazelenir
          router.refresh();
        }
      } catch {
        /* bir sonraki turda tekrar dene */
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [router]);

  // Canlı yoksa sıradaki maçı yalnızca hafif canlı kaynaktan tazele (60 sn)
  useEffect(() => {
    if (live) return;
    const refreshNext = () => {
      fetch("/api/portal", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { fixtures?: { next?: Fixture[]; live?: Fixture | null } } | null) => {
          if (!d?.fixtures) return;
          setLive(d.fixtures.live ?? null);
          setNext(d.fixtures.next?.[0] ?? null);
        })
        .catch(() => {});
    };
    const id = setInterval(refreshNext, 60_000);
    return () => clearInterval(id);
  }, [live]);

  const match = live ?? next;

  if (!match) {
    return (
      <div className="home-match-card glass rounded-3xl text-center">
        <p className="font-display text-lg uppercase tracking-wider text-mavi">Sıradaki Maç</p>
        <p className="mt-4 text-sm leading-relaxed text-muted">Maç takvimi henüz yayınlanmadı.</p>
        <p className="mt-2 text-xs text-muted">Üstteki Verileri Yenile düğmesiyle tekrar deneyebilirsin.</p>
      </div>
    );
  }

  const isLive = Boolean(live) && match.state === "in";

  return (
    <>
      <div
        className={`home-match-card glass relative overflow-hidden rounded-3xl ${isLive ? "ring-1 ring-bordo-300/60" : ""}`}
        onClick={() => {
          if (!isLive) return;
          setCenterFixture(live);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (isLive && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setCenterFixture(live);
            setOpen(true);
          }
        }}
        role={isLive ? "button" : undefined}
        tabIndex={isLive ? 0 : undefined}
        aria-label={isLive ? "Canlı Maç Merkezi'ni aç" : undefined}
        style={isLive ? { cursor: "pointer" } : undefined}
      >
        <div className={`absolute inset-x-0 top-0 h-[3px] ${isLive ? "animate-pulse bg-bordo-300" : "bg-gradient-to-r from-bordo via-bordo-400 to-mavi"}`} />

        <div className="home-match-heading flex items-center justify-between gap-2">
          {isLive ? (
            <span className="flex items-center gap-1.5 rounded-full bg-[#d81e3f] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white shadow-[0_0_18px_-2px_rgba(216,30,63,0.9)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Canlı
            </span>
          ) : (
            <span className="font-display text-xs uppercase tracking-[0.2em] text-muted">Sıradaki Maç</span>
          )}
          <span className="truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-mavi-200">
            {match.competition}
          </span>
        </div>

        <div className="home-match-teams flex items-center justify-between gap-2">
          <Team side={match.home} />
          <div className="flex shrink-0 flex-col items-center px-1">
            {isLive ? (
              <>
                <span className="font-display text-4xl leading-none text-bone tabular-nums sm:text-5xl">
                  {match.home.score ?? 0}<span className="mx-1 text-muted">:</span>{match.away.score ?? 0}
                </span>
                <span className="mt-2 flex items-center gap-1 rounded-full bg-bordo/30 px-2.5 py-0.5 text-[11px] font-extrabold text-bordo-300">
                  <span className="tabular-nums">{match.clock ?? "—"}</span>
                  <span className="opacity-60">•</span>
                  <span>{match.phase}</span>
                </span>
              </>
            ) : (
              <>
                <span className="font-display text-2xl text-muted">VS</span>
                <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-bordo-300">
                  {match.tsIsHome ? "İç Saha" : "Deplasman"}
                </span>
              </>
            )}
          </div>
          <Team side={match.away} />
        </div>

        <div className="home-match-meta flex flex-col items-center gap-2 text-center text-xs font-semibold text-muted">
          <span className="flex items-center gap-1.5" suppressHydrationWarning>
            <CalendarDays size={12} className="shrink-0 text-mavi" />
            {fmtDateLong(match.date)} • {fmtTime(match.date)}
          </span>
          {match.venue ? (
            <span className="home-match-venue flex items-center gap-1.5">
              <MapPin size={12} className="shrink-0 text-mavi" />{match.venue}
            </span>
          ) : null}
        </div>

        {match.tv ? <div className="home-match-tv flex justify-center"><TvBadge tv={match.tv} /></div> : null}

        {isLive ? (
          <div className="flex flex-col items-center gap-1.5">
            <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-bordo to-bordo-400 px-4 py-2 text-[11px] font-extrabold text-white sm:text-xs">
              <Radio size={12} /> Canlı Maç Merkezi&apos;ni Aç <ArrowUpRight size={13} />
            </span>
            <span className="text-[10px] font-semibold text-muted">
              {verification?.confirmed ? "Skor iki kaynakla doğrulandı" : "Skor 15 sn'de bir güncellenir"}
            </span>
          </div>
        ) : (
          <div className="home-countdown"><Countdown target={match.date} /></div>
        )}
      </div>

      {open && centerFixture ? (
        <MatchDetailModal
          fixture={centerFixture}
          onClose={() => {
            setOpen(false);
            setCenterFixture(null);
          }}
        />
      ) : null}
    </>
  );
}
