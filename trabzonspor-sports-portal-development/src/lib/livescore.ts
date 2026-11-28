import { fetchJson } from "./http";
import type { Side } from "./types";

/**
 * İkinci kaynak: TheSportsDB takım maç akışı (sıradaki + son maçlar).
 * ESPN'deki canlı skoru bu kaynakla çapraz doğrularız. TheSportsDB ücretsiz anahtarda
 * canlı dakika vermez (livescore ucu boş döner), bu yüzden yalnızca skor/durum doğrulaması yapılır.
 * Kaynak veri döndürmezse "veri yok" olarak raporlanır — asla uydurma onay verilmez.
 */

const KEY = process.env.THESPORTSDB_API_KEY || "123";
const TSDB = `https://www.thesportsdb.com/api/v1/json/${KEY}`;
const TSDB_TEAM = process.env.THESPORTSDB_TEAM_ID || "133796";
export const TSDB_SOURCE_URL = `https://www.thesportsdb.com/team/${TSDB_TEAM}`;

interface TsdbEvent {
  idEvent: string;
  strEvent?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strStatus?: string | null;
  strProgress?: string | null;
  dateEvent?: string;
  strTimestamp?: string | null;
}

export interface TsdbSnapshot {
  id: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string | null;
  progress: string | null;
  kickoff: string | null;
  finished: boolean;
  live: boolean;
}

const norm = (s: string) =>
  s.toLocaleLowerCase("en-US").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Yalnızca Trabzonspor'un maçları arasından, tarih ±18 saat + rakip adı uyuşan kaydı seçer. */
function pick(snapshot: TsdbSnapshot[], home: Side, away: Side, kickoffIso: string): TsdbSnapshot | null {
  const ts = +new Date(kickoffIso);
  const opponent = home.id === "997" ? away.name : home.name;
  const opp = norm(opponent).split(" ").filter((t) => t.length > 2);
  let best: { score: number; hit: TsdbSnapshot } | null = null;
  for (const s of snapshot) {
    if (!s.kickoff) continue;
    if (Math.abs(+new Date(s.kickoff) - ts) > 18 * 3600_000) continue;
    const field = norm(`${s.home} ${s.away}`);
    const nameHits = opp.filter((t) => field.includes(t)).length;
    if (!nameHits) continue;
    const score = nameHits + (s.live ? 0.5 : 0) + (s.homeScore != null ? 0.2 : 0);
    if (!best || score > best.score) best = { score, hit: s };
  }
  return best?.hit ?? null;
}

function toSnapshot(e: TsdbEvent): TsdbSnapshot {
  const status = (e.strStatus ?? "").toUpperCase();
  const hs = e.intHomeScore != null && e.intHomeScore !== "" ? Number(e.intHomeScore) : null;
  const as = e.intAwayScore != null && e.intAwayScore !== "" ? Number(e.intAwayScore) : null;
  return {
    id: e.idEvent,
    home: e.strHomeTeam ?? "",
    away: e.strAwayTeam ?? "",
    homeScore: Number.isFinite(hs) ? hs : null,
    awayScore: Number.isFinite(as) ? as : null,
    status: e.strStatus ?? null,
    progress: e.strProgress ?? null,
    kickoff: e.strTimestamp ? `${e.strTimestamp.replace(" ", "T")}Z` : e.dateEvent ? `${e.dateEvent}T00:00:00Z` : null,
    finished: /FT|AET|PEN|FINISHED/.test(status),
    live: /1H|2H|HT|LIVE|ET/.test(status),
  };
}

export async function getTsdbSnapshots(): Promise<TsdbSnapshot[]> {
  const [next, last] = await Promise.all([
    fetchJson<{ events?: TsdbEvent[] }>(`${TSDB}/eventsnext.php?id=${TSDB_TEAM}`, { retries: 2 }).catch(() => ({ events: [] })),
    fetchJson<{ results?: TsdbEvent[] }>(`${TSDB}/eventslast.php?id=${TSDB_TEAM}`, { retries: 2 }).catch(() => ({ results: [] })),
  ]);
  return [...(next.events ?? []), ...(last.results ?? [])].map(toSnapshot);
}

/** ESPN maçı için TheSportsDB eşleşmesi. */
export async function crossCheck(home: Side, away: Side, kickoffIso: string): Promise<TsdbSnapshot | null> {
  const snapshots = await getTsdbSnapshots();
  return pick(snapshots, home, away, kickoffIso);
}
