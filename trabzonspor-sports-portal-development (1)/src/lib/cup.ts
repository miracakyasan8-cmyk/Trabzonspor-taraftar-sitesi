import { cached } from "./cache";
import { fetchJson } from "./http";
import { TS_ID, TS_LOGO } from "./constants";
import type { Fixture, MatchState } from "./types";

/**
 * Ziraat Türkiye Kupası — ESPN bu turnuvayı yayımlamadığı için Trabzonspor'un
 * TheSportsDB maç akışından (sıradaki/son maçlar) yalnızca kupa maçları alınır.
 * Kupa eleme usulüdür; puan tablosu yoktur.
 */

const TSDB = `https://www.thesportsdb.com/api/v1/json/${process.env.THESPORTSDB_API_KEY || "123"}`;
const TSDB_TEAM = "133796";
export const CUP_SLUG = "tsdb.tur.cup";
export const CUP_LABEL = "Ziraat Türkiye Kupası";

interface TsdbEvent {
  idEvent: string;
  strLeague?: string;
  strHomeTeam: string;
  strAwayTeam: string;
  idHomeTeam?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strTimestamp?: string | null;
  dateEvent: string;
  strTime?: string | null;
  strVenue?: string | null;
  strStatus?: string | null;
  strHomeTeamBadge?: string | null;
  strAwayTeamBadge?: string | null;
}

const IS_CUP = /turkish cup|türkiye kupas|ziraat/i;

function toFixture(e: TsdbEvent): Fixture {
  const tsIsHome = e.idHomeTeam === TSDB_TEAM || /trabzonspor/i.test(e.strHomeTeam);
  const hs = e.intHomeScore != null && e.intHomeScore !== "" ? Number(e.intHomeScore) : null;
  const as = e.intAwayScore != null && e.intAwayScore !== "" ? Number(e.intAwayScore) : null;
  const status = (e.strStatus ?? "").toUpperCase();
  const period = /2H|FT|AET|PEN/.test(status) ? 2 : /1H|HT/.test(status) ? 1 : null;
  const state: MatchState = hs != null && as != null && /FT|AET|PEN|MATCH FINISHED/.test(status || "FT")
    ? "post"
    : /1H|2H|HT|LIVE|ET/.test(status) ? "in" : "pre";
  const date = e.strTimestamp
    ? `${e.strTimestamp.replace(" ", "T")}${/Z|[+-]\d\d:?\d\d$/.test(e.strTimestamp) ? "" : "Z"}`
    : `${e.dateEvent}T${e.strTime || "17:00:00"}Z`;
  const gf = tsIsHome ? hs : as;
  const ga = tsIsHome ? as : hs;
  const side = (name: string, badge: string | null | undefined, score: number | null, isTs: boolean) => ({
    id: isTs ? TS_ID : `tsdb-${name}`,
    name: isTs ? "Trabzonspor" : name,
    abbr: name.slice(0, 3).toUpperCase(),
    logo: isTs ? TS_LOGO : (badge ?? null),
    score: state === "pre" ? null : score,
  });
  return {
    id: `tsdb-${e.idEvent}`,
    leagueSlug: CUP_SLUG,
    competition: CUP_LABEL,
    date: new Date(date).toISOString(),
    venue: e.strVenue ?? null,
    city: null,
    state,
    clock: null,
    statusText: state === "post" ? "Maç Sonu" : state === "in" ? "Devam Ediyor" : "Başlamadı",
    period,
    phase: state === "post" ? "Maç Sonu" : state === "in" ? (period === 1 ? "İlk Yarı" : "İkinci Yarı") : "Başlamadı",
    home: side(e.strHomeTeam, e.strHomeTeamBadge, hs, tsIsHome),
    away: side(e.strAwayTeam, e.strAwayTeamBadge, as, !tsIsHome),
    tsIsHome,
    outcome: state === "post" && gf != null && ga != null ? (gf > ga ? "W" : gf < ga ? "L" : "D") : null,
    tv: null,
  };
}

export async function getCupFixtures(): Promise<Fixture[]> {
  return cached("tsdb:cup", 10 * 60_000, async () => {
    const [next, last] = await Promise.all([
      fetchJson<{ events?: TsdbEvent[] }>(`${TSDB}/eventsnext.php?id=${TSDB_TEAM}`).catch(() => ({ events: [] })),
      fetchJson<{ results?: TsdbEvent[] }>(`${TSDB}/eventslast.php?id=${TSDB_TEAM}`).catch(() => ({ results: [] })),
    ]);
    return [...(next.events ?? []), ...(last.results ?? [])]
      .filter((e) => IS_CUP.test(e.strLeague ?? ""))
      .map(toFixture);
  });
}
