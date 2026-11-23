"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowUpRight, ExternalLink, RefreshCw, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import type { EnrichedSquad } from "@/lib/squad";
import type { Position } from "@/lib/types";
import { OFFICIAL_SQUAD_URL } from "@/lib/constants";
import { POSITION_GROUP, POSITION_TR } from "@/lib/labels";
import { fmtTimeSec } from "@/lib/format";
import type { EnrichedPlayer } from "@/lib/squad";
import { SectionError } from "./SectionState";
import { PlayerModal } from "./PlayerModal";
import { Reveal } from "./Reveal";

const GROUPS: Position[] = ["G", "D", "M", "F"];

function PlayerCard({ player, onOpen }: { player: EnrichedPlayer; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      onClick={onOpen}
      className="card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-ink-850 text-left"
      aria-label={`${player.name} profilini aç`}
    >
      <span className="relative block aspect-[4/4.7] w-full overflow-hidden bg-gradient-to-b from-ink-700/60 to-ink-900">
        {player.photo && !failed ? (
          <Image
            src={player.photo}
            alt={player.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain object-bottom p-2 transition-transform duration-500 group-hover:scale-[1.06]"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
            <UserRound size={34} />
            <span className="px-3 text-center text-[10px] font-semibold">Resmî fotoğraf bekleniyor</span>
          </span>
        )}
        <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-ink-950/75 font-display text-sm text-white backdrop-blur">
          {player.jersey ?? "—"}
        </span>
        {player.isNew ? (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-mavi px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-ink-950">
            <Sparkles size={10} /> Yeni Transfer
          </span>
        ) : null}
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-ink-950 to-transparent px-3 pb-2.5 pt-8 text-[10px] font-bold uppercase tracking-wider text-mavi opacity-0 transition-opacity group-hover:opacity-100">
          Profili aç <ArrowUpRight size={13} />
        </span>
      </span>
      <span className="flex min-h-[74px] flex-col justify-center px-3 py-3">
        <span className="line-clamp-1 text-[13px] font-bold leading-tight text-bone group-hover:text-mavi-200">
          {player.name}
        </span>
        <span className="mt-1 flex items-center justify-between gap-2 text-[10px] font-semibold text-muted">
          <span className="truncate">{[player.nationality, player.age ? `${player.age} yaş` : null].filter(Boolean).join(" • ") || POSITION_TR[player.position]}</span>
          {player.marketValue ? <span className="shrink-0 rounded-md bg-mavi/12 px-1.5 py-0.5 text-[9px] font-extrabold text-mavi-200">{player.marketValue}</span> : null}
        </span>
      </span>
    </button>
  );
}

export function SquadSection({ squad, error }: { squad: EnrichedSquad | null; error?: string }) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Position>("all");
  const [newOnly, setNewOnly] = useState(false);

  const groups = useMemo(() => {
    const list = (squad?.players ?? []).filter((p) => !newOnly || p.isNew);
    return GROUPS.map((g) => ({ pos: g, players: list.filter((p) => p.position === g).sort((a, b) => (a.jersey ?? 999) - (b.jersey ?? 999)) }));
  }, [squad, newOnly]);

  if (!squad) return <SectionError title="Resmî kadro alınamadı" message={error} />;

  return (
    <>
      {/* Resmî kaynak ve teknik direktör */}
      <div className="glass relative mb-8 flex flex-wrap items-center gap-5 overflow-hidden rounded-3xl p-5 sm:p-7">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-bordo via-bordo-400 to-mavi" />
        <span className="ml-2 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-bordo/40 to-mavi-600/30">
          <UserRound size={30} className="text-mavi-200" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-mavi">Teknik Direktör</p>
          {squad.coach ? (
            <>
              <p className="font-display text-3xl uppercase leading-tight text-bone sm:text-4xl">{squad.coach.name}</p>
              <a href={squad.coach.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-mavi">
                Kaynak: {squad.coach.source} <ExternalLink size={11} />
              </a>
            </>
          ) : (
            <p className="text-sm font-semibold text-muted">Teknik direktör bilgisi şu an alınamadı.</p>
          )}
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <p className="font-display text-3xl text-bone">{squad.players.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Oyuncu</p>
          </div>
          <div>
            <p className="font-display text-3xl text-bone">{squad.newCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Yeni</p>
          </div>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-ink-900/70 px-4 py-3.5 text-[11px] font-semibold text-muted">
        <span className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-mavi" />
          Resmî kaynak: <a href={OFFICIAL_SQUAD_URL} target="_blank" rel="noopener noreferrer" className="text-mavi-200 hover:text-mavi">trabzonspor.org.tr</a>
        </span>
        <span className="flex items-center gap-1.5" suppressHydrationWarning>
          <RefreshCw size={12} className="text-mavi" /> Kontrol: {fmtTimeSec(squad.checkedAt)} TSİ
          {squad.stale ? <span className="ml-2 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-200">son başarılı veri</span> : null}
        </span>
      </div>

      {squad.departed?.length ? (
        <p className="mb-8 rounded-2xl border border-white/8 bg-ink-850/75 px-4 py-3 text-xs text-muted">
          Resmî listeden ayrılanlar: <b className="text-bone">{squad.departed.map((d) => d.name).join(", ")}</b>
        </p>
      ) : null}

      <div className="mb-8 flex flex-wrap gap-2">
        <button onClick={() => { setFilter("all"); setNewOnly(false); }} aria-pressed={filter === "all" && !newOnly} className={`rounded-full px-5 py-2.5 text-[13px] font-bold transition-all ${filter === "all" && !newOnly ? "bg-gradient-to-r from-bordo to-bordo-400 text-white" : "border border-white/10 bg-white/[0.03] text-muted hover:text-bone"}`}>
          Tüm Kadro
        </button>
        {GROUPS.map((g) => (
          <button key={g} onClick={() => { setFilter(g); setNewOnly(false); }} aria-pressed={filter === g && !newOnly} className={`rounded-full px-5 py-2.5 text-[13px] font-bold transition-all ${filter === g && !newOnly ? "bg-gradient-to-r from-bordo to-bordo-400 text-white" : "border border-white/10 bg-white/[0.03] text-muted hover:text-bone"}`}>
            {POSITION_GROUP[g]}
          </button>
        ))}
        <button onClick={() => { setNewOnly(!newOnly); setFilter("all"); }} aria-pressed={newOnly} className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-bold transition-all ${newOnly ? "bg-mavi text-ink-950" : "border border-white/10 bg-white/[0.03] text-muted hover:text-bone"}`}>
          <Sparkles size={13} /> Yeni Transferler {squad.newCount ? `(${squad.newCount})` : ""}
        </button>
      </div>

      <div className="flex flex-col gap-12">
        {groups.map((g) => {
          if ((filter !== "all" && filter !== g.pos) || !g.players.length) return null;
          return (
            <Reveal key={g.pos}>
              <h2 className="mb-5 flex items-center gap-3 font-display text-2xl uppercase tracking-[0.18em] text-mavi">
                {POSITION_GROUP[g.pos]}
                <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-xs text-bone">{g.players.length}</span>
                <span className="h-px flex-1 bg-white/8" />
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                {g.players.map((p) => <PlayerCard key={p.id} player={p} onOpen={() => setPlayerId(p.id)} />)}
              </div>
            </Reveal>
          );
        })}
        {groups.every((g) => !g.players.length) ? (
          <p className="rounded-2xl border border-white/8 bg-ink-850 px-6 py-12 text-center text-sm text-muted">
            Bu filtrede oyuncu bulunmuyor. Resmî kadro yenilendiğinde yeni oyuncular otomatik görünür.
          </p>
        ) : null}
      </div>

      {playerId ? <PlayerModal id={playerId} onClose={() => setPlayerId(null)} /> : null}
    </>
  );
}
