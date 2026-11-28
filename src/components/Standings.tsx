"use client";

import { useState } from "react";
import { TS_ID } from "@/lib/constants";
import type { StandingGroup, TournamentStanding } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

function StandingsTable({ group, title }: { group: StandingGroup; title?: string }) {
  const zones = Array.from(
    new Map(group.rows.filter((r) => r.zone).map((r) => [r.zone as string, r.zoneColor])).entries(),
  );

  return (
    <div className="glass overflow-hidden rounded-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-5 py-4 sm:px-6">
        <span className="font-display text-sm uppercase tracking-[0.2em] text-bone">
          {title ?? group.name}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-400" /> Canlı Veri •{" "}
          {group.rows.length} takım
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-sm">
          <thead>
            <tr className="border-b border-white/8 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
              <th className="px-3 py-3 sm:px-4">#</th>
              <th className="px-2 py-3">Takım</th>
              <th className="px-2 py-3 text-center">O</th>
              <th className="px-2 py-3 text-center">G</th>
              <th className="px-2 py-3 text-center">B</th>
              <th className="px-2 py-3 text-center">M</th>
              <th className="hidden px-2 py-3 text-center md:table-cell">A</th>
              <th className="hidden px-2 py-3 text-center md:table-cell">Y</th>
              <th className="px-2 py-3 text-center">AV</th>
              <th className="px-3 py-3 text-right sm:px-4">P</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((r) => {
              const isTS = r.teamId === TS_ID;
              return (
                <tr
                  key={r.teamId}
                  style={{ borderLeftColor: r.zoneColor ?? "transparent" }}
                  className={`border-b border-white/5 border-l-[3px] transition-colors ${
                    isTS ? "bg-gradient-to-r from-bordo/35 via-bordo/15 to-mavi/10" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <td className={`px-3 py-2 font-display sm:px-4 ${isTS ? "text-mavi" : "text-muted"}`}>
                    {r.rank}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-3">
                      <TeamLogo src={r.logo} name={r.team} size={30} />
                      <span className={`font-bold ${isTS ? "text-mavi-200" : "text-bone"}`}>{r.team}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center text-muted">{r.played}</td>
                  <td className="px-2 py-2 text-center text-muted">{r.won}</td>
                  <td className="px-2 py-2 text-center text-muted">{r.drawn}</td>
                  <td className="px-2 py-2 text-center text-muted">{r.lost}</td>
                  <td className="hidden px-2 py-2 text-center text-muted md:table-cell">{r.gf}</td>
                  <td className="hidden px-2 py-2 text-center text-muted md:table-cell">{r.ga}</td>
                  <td className="px-2 py-2 text-center text-muted">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                  <td className={`px-3 py-2 text-right font-display text-lg sm:px-4 ${isTS ? "text-white" : "text-bone"}`}>
                    {r.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-white/8 px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted sm:px-6">
        <span>O: Oynanan • G/B/M • A: Atılan • Y: Yenilen • AV: Averaj • P: Puan</span>
        {zones.map(([name, color]) => (
          <span key={name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: color ?? "#8b99ad" }} /> {name}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Akıllı puan durumu: Trabzonspor'un mücadele ettiği tüm kulvarlar (Süper Lig,
 * UEFA Konferans Ligi vb.) sekmeler halinde; hangi turnuvada playsa o tablo aktif.
 */
export function TournamentStandings({ tournaments }: { tournaments: TournamentStanding[] }) {
  const [active, setActive] = useState(0);
  const current = tournaments[active] ?? tournaments[0];

  return (
    <div>
      <div className="mb-8 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Aktif kulvarlar">
        {tournaments.map((t, i) => {
          const isActive = i === active;
          return (
            <button
              key={t.slug}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(i)}
              className={`shrink-0 rounded-full px-5 py-2.5 text-[13px] font-bold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-bordo to-bordo-400 text-white shadow-[0_8px_25px_-8px_rgba(138,21,56,0.8)]"
                  : "border border-white/10 bg-white/[0.03] text-muted hover:border-mavi/30 hover:text-bone"
              }`}
            >
              {t.competition}
              {t.season ? <span className={isActive ? "ml-2 text-white/70" : "ml-2 text-muted/60"}>{t.season}</span> : null}
            </button>
          );
        })}
      </div>

      <p className="mb-6 rounded-2xl border border-white/8 bg-ink-850/70 px-4 py-3 text-xs font-semibold text-muted">
        Aktif kulvar: <b className="text-mavi-200">{current.competition}</b> — Trabzonspor şu an bu turnuvada
        mücadele ediyor. Kulvar değiştiğinde (lig ↔ Avrupa) sekmeler otomatik güncellenir.
      </p>

      <div className="flex flex-col gap-6">
        {current.groups.map((g) => (
          <StandingsTable key={g.name} group={g} title={`${current.competition}${current.groups.length > 1 ? ` • ${g.name}` : ""}`} />
        ))}
      </div>
    </div>
  );
}
