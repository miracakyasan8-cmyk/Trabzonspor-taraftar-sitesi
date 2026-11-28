"use client";

import Image from "next/image";
import { useState } from "react";
import { BadgeCheck, Building2, ExternalLink, Sparkles, UserRound } from "lucide-react";
import type { LeadershipFigure } from "@/lib/leadership";

function LeadershipCard({ figure, roleIcon }: { figure: LeadershipFigure; roleIcon: "president" | "coach" }) {
  const [failed, setFailed] = useState(false);
  const Icon = roleIcon === "president" ? Building2 : UserRound;
  return (
    <article className="glass relative overflow-hidden rounded-3xl p-5 sm:p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8A1538] via-bordo-400 to-[#3BB4E5]" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          <span className="relative block h-32 w-28 overflow-hidden rounded-2xl border border-white/15 bg-ink-800 sm:h-40 sm:w-36">
            {figure.photo && !failed ? (
              <Image
                src={figure.photo}
                alt={figure.name}
                fill
                sizes="160px"
                className="object-contain object-bottom"
                onError={() => setFailed(true)}
                priority
              />
            ) : (
              <span className="flex h-full items-center justify-center text-muted">
                <Icon size={40} />
              </span>
            )}
          </span>
          {figure.changed ? (
            <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-[#3BB4E5] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-ink-950">
              <Sparkles size={9} /> Yeni
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#3BB4E5]">
            <Icon size={12} /> {figure.roleLabel}
          </span>
          <h3 className="mt-1 font-display text-2xl uppercase leading-none text-bone sm:text-3xl">{figure.name}</h3>
          <p className="mt-1 text-[11px] font-semibold text-muted">{figure.title}</p>

          <dl className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {figure.detail.map((d) => (
              <div key={d.label} className="rounded-xl border border-white/6 bg-ink-950/50 px-2.5 py-2">
                <dt className="text-[9px] font-bold uppercase tracking-wider text-muted">{d.label}</dt>
                <dd className="mt-0.5 break-words text-[11px] font-bold text-bone">{d.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-3 flex flex-wrap gap-2">
            {figure.profileUrl ? (
              <a href={figure.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-1.5 text-[10px] font-bold text-muted hover:text-bone">
                <BadgeCheck size={11} className="text-[#3BB4E5]" /> Resmî profil <ExternalLink size={10} />
              </a>
            ) : null}
            {figure.tmUrl ? (
              <a href={figure.tmUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#3BB4E5]/80 to-[#3BB4E5] px-3.5 py-1.5 text-[10px] font-extrabold text-ink-950">
                <ExternalLink size={11} /> Transfermarkt <ExternalLink size={10} />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function LeadershipSection({ president, coach }: { president: LeadershipFigure | null; coach: LeadershipFigure | null }) {
  if (!president && !coach) return null;
  return (
    <section aria-label="Resmî yönetim organı" className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-display text-2xl uppercase tracking-[0.14em] text-bone">Yönetim &amp; <span className="text-[#3BB4E5]">Teknik Kadro</span></h2>
        <span className="h-px flex-1 bg-white/8" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {president ? <LeadershipCard figure={president} roleIcon="president" /> : null}
        {coach ? <LeadershipCard figure={coach} roleIcon="coach" /> : null}
      </div>
    </section>
  );
}
