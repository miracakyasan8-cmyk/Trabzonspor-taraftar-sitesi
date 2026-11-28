"use client";

import Image from "next/image";
import { useState } from "react";
import type { MatchPlayerFull } from "@/lib/espn";
import { placeLineup } from "@/lib/formation";

function ratingTone(r: number) {
  if (r >= 7.5) return "bg-emerald-500 text-ink-950";
  if (r >= 6.5) return "bg-mavi text-ink-950";
  if (r >= 6) return "bg-amber-400 text-ink-950";
  return "bg-bordo-300 text-white";
}

function Tile({ p, onClick }: { p: MatchPlayerFull; onClick?: () => void }) {
  const [failed, setFailed] = useState(false);
  const surname = p.name.trim().split(/\s+/).slice(-1)[0];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={`${p.name} • ${p.rating.toFixed(1)}`}
      className="group flex w-[58px] flex-col items-center sm:w-[78px]"
    >
      <span className="relative">
        <span className="relative block h-11 w-11 overflow-hidden rounded-full border-2 border-white/40 bg-gradient-to-b from-ink-600 to-ink-850 shadow-[0_8px_18px_-6px_rgba(0,0,0,0.9)] transition-transform group-enabled:group-hover:scale-110 sm:h-[60px] sm:w-[60px]">
          {p.photo && !failed ? (
            <Image src={p.photo} alt={p.name} fill sizes="64px" className="object-cover object-top" onError={() => setFailed(true)} />
          ) : (
            <span className="jersey flex h-full w-full items-center justify-center font-display text-base text-white">{p.jersey ?? "—"}</span>
          )}
        </span>
        <span className="absolute -left-1.5 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-white/30 bg-ink-950 px-1 font-display text-[10px] text-white sm:h-6 sm:min-w-6 sm:text-xs">
          {p.jersey ?? "—"}
        </span>
        <span className={`absolute -right-2 -top-1 rounded-md px-1 py-0.5 text-[9px] font-extrabold tabular-nums shadow sm:text-[10px] ${ratingTone(p.rating)}`}>
          {p.rating.toFixed(1)}
        </span>
        {p.stats.totalGoals ? (
          <span className="absolute -bottom-1 -right-1.5 rounded-full bg-white px-1 text-[9px] font-extrabold text-ink-950">⚽{p.stats.totalGoals > 1 ? p.stats.totalGoals : ""}</span>
        ) : null}
        {p.stats.redCards ? <span className="absolute -bottom-1 -left-1 h-3.5 w-2.5 rounded-[2px] bg-red-500" title="Kırmızı kart" /> : p.stats.yellowCards ? <span className="absolute -bottom-1 -left-1 h-3.5 w-2.5 rounded-[2px] bg-amber-400" title="Sarı kart" /> : null}
      </span>
      <span className="mt-1.5 max-w-full truncate rounded bg-ink-950/85 px-1.5 py-0.5 text-[9px] font-bold text-bone sm:text-[10px]">
        {surname}
        {p.subbedOut ? <span className="ml-0.5 text-bordo-300">↓</span> : null}
      </span>
    </button>
  );
}

/** Oynanmış maç sahası: resmî diziliş slotları + fotoğraf + forma no + ad + maç reytingi. */
export function PhotoPitch({
  formation,
  starters,
  onPlayer,
}: {
  formation: string | null;
  starters: MatchPlayerFull[];
  onPlayer?: (id: string) => void;
}) {
  const placed = placeLineup(formation, starters);
  return (
    <div className="pitch-bg relative aspect-[4/5] w-full sm:aspect-[4/4.3]">
      <div className="pointer-events-none absolute inset-3 rounded-lg border border-white/12" />
      <div className="pointer-events-none absolute inset-x-3 top-1/2 h-px bg-white/12" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12" />
      <div className="pointer-events-none absolute left-1/2 top-3 h-[12%] w-[46%] -translate-x-1/2 border border-t-0 border-white/12" />
      <div className="pointer-events-none absolute bottom-3 left-1/2 h-[12%] w-[46%] -translate-x-1/2 border border-b-0 border-white/12" />
      {placed.map(({ player, x, y }) => (
        <div key={player.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
          <Tile p={player} onClick={onPlayer ? () => onPlayer(player.id) : undefined} />
        </div>
      ))}
    </div>
  );
}
