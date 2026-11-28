"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { TS_ID } from "@/lib/constants";
import { fmtDateShort } from "@/lib/format";
import type { Fixture } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";
import { MatchDetailModal } from "./MatchDetailModal";
import { SectionError, EmptyState } from "./SectionState";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const OUTCOME = {
  W: { label: "G", cls: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400" },
  D: { label: "B", cls: "border-amber-500/40 bg-amber-500/15 text-amber-400" },
  L: { label: "M", cls: "border-red-500/40 bg-red-500/15 text-red-400" },
} as const;

/**
 * Oynanmış maçlar — arşiv. Her satıra tıklayınca detay penceresi açılır
 * (resmi ilk 11 + yedekler, oyuncu bazlı istatistikler ve reyting, maç olayları).
 */
export function MatchArchive({ fixtures, error }: { fixtures: Fixture[] | null; error?: string }) {
  const [selected, setSelected] = useState<Fixture | null>(null);

  if (!fixtures) return <SectionError title="Arşiv alınamadı" message={error} />;

  return (
    <>
      <SectionHeading
        index="02"
        kicker="Arşiv & Detay"
        title="Oynanmış"
        accent="Maçlar"
        description="Bir maça dokun: skor, sahadaki Trabzonspor 11'i ve reytingler, maç olayları."
      />

      {fixtures.length === 0 ? (
        <EmptyState message="Henüz oynanmış maç bulunamadı." />
      ) : (
        <div className="flex flex-col gap-3">
          {fixtures.map((f, i) => {
            const played = f.state === "post";
            return (
              <Reveal key={f.id} delay={Math.min(i * 0.04, 0.3)}>
                <button
                  onClick={() => setSelected(f)}
                  className="card-hover flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-ink-850/90 p-4 text-left sm:gap-5 sm:p-5"
                >
                  <div className="flex w-16 shrink-0 flex-col items-start gap-0.5">
                    <span className="font-display text-xl text-bone leading-none">{fmtDateShort(f.date)}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted">
                      {f.competition.replace("Trendyol ", "")}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2 flex-1">
                      <TeamLogo src={f.home.logo} name={f.home.name} size={34} />
                      <span className={`truncate text-sm font-bold ${f.home.id === TS_ID ? "text-mavi-200" : "text-bone"}`}>
                        {f.home.name}
                      </span>
                    </div>
                    <span className="shrink-0 font-display text-2xl tabular-nums text-bone sm:text-3xl">
                      {f.home.score ?? 0}<span className="mx-1.5 text-muted">-</span>{f.away.score ?? 0}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                      <span className={`truncate text-right text-sm font-bold ${f.away.id === TS_ID ? "text-mavi-200" : "text-bone"}`}>
                        {f.away.name}
                      </span>
                      <TeamLogo src={f.away.logo} name={f.away.name} size={34} />
                    </div>
                  </div>

                  <div className="hidden w-12 shrink-0 items-center justify-center sm:flex">
                    {f.outcome ? (
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg border font-display text-sm ${OUTCOME[f.outcome].cls}`}>
                        {OUTCOME[f.outcome].label}
                      </span>
                    ) : null}
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-muted" />
                </button>
              </Reveal>
            );
          })}
        </div>
      )}


      {selected ? <MatchDetailModal fixture={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}
