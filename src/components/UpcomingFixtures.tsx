"use client";

import { useState } from "react";
import { MapPin, ShieldCheck, Tv } from "lucide-react";
import { fmtDateLong, fmtTime } from "@/lib/format";
import type { Fixture } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";
import { Countdown } from "./Countdown";
import { Reveal } from "./Reveal";
import { MatchDetailModal } from "./MatchDetailModal";

/** Yaklaşan maç kartı: üstte yayıncı kanal, takımlar, geri sayım; resmî kadro açıklandıysa saha görünümü. */
export function UpcomingFixtures({ fixtures, announced = [] }: { fixtures: Fixture[]; announced?: string[] }) {
  const [selected, setSelected] = useState<Fixture | null>(null);
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {fixtures.map((f, i) => {
          const officialXi = announced.includes(f.id);
          const channel = f.tv?.channel;
          return (
            <Reveal key={f.id} delay={Math.min(i * 0.06, 0.4)}>
              <div className="card-hover glass flex h-full flex-col overflow-hidden rounded-3xl">
                {/* Yayıncı kanal — kartın üstünde */}
                <div
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider ${
                    channel ? "bg-gradient-to-r from-[#8A1538] to-[#3BB4E5]/70 text-white" : "bg-white/[0.04] text-muted"
                  }`}
                >
                  <Tv size={13} />
                  {channel ? `Yayın: ${channel}` : (f.tv?.note ?? "Yayıncı henüz açıklanmadı")}
                  {channel && !f.tv?.confirmed ? <span className="font-semibold normal-case tracking-normal opacity-80">• kanal no yakında</span> : null}
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="mb-4 flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider">
                    <span className="rounded-md bg-mavi/12 px-2 py-1 text-mavi-200" suppressHydrationWarning>
                      {fmtDateLong(f.date)} • {fmtTime(f.date)}
                    </span>
                    <span className="truncate text-muted">{f.competition}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                      <TeamLogo src={f.home.logo} name={f.home.name} size={64} />
                      <span className="text-sm font-bold leading-tight text-bone">{f.home.name}</span>
                    </div>
                    <div className="shrink-0 text-center">
                      <span className="font-display text-2xl text-muted">VS</span>
                      <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-widest text-muted">
                        {f.tsIsHome ? "İç Saha" : "Deplasman"}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                      <TeamLogo src={f.away.logo} name={f.away.name} size={64} />
                      <span className="text-sm font-bold leading-tight text-bone">{f.away.name}</span>
                    </div>
                  </div>

                  {f.venue ? (
                    <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted">
                      <MapPin size={12} className="text-mavi" />
                      {f.venue}
                      {f.city ? `, ${f.city}` : ""}
                    </p>
                  ) : null}

                  <div className="mt-5">
                    <Countdown target={f.date} />
                  </div>

                  {officialXi ? (
                    <button
                      type="button"
                      onClick={() => setSelected(f)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2.5 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-400/20"
                    >
                      <ShieldCheck size={14} /> Resmî kadro açıklandı — sahayı gör
                    </button>
                  ) : null}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
      {selected ? <MatchDetailModal fixture={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}
