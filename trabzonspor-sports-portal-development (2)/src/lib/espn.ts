import { cached } from "./cache";
import { fetchJson } from "./http";
import { TS_ID } from "./constants";
import { getCoach } from "./coach";
import { computeMatchRating } from "./ratings";
import { CUP_SLUG, getCupFixtures } from "./cup";
import type {
  Fixture,
  FixturesData,
  LineupData,
  LineupPlayer,
  MatchEvent,
  MatchState,
  Player,
  Position,
  Side,
  SquadData,
  StandingRow,
  StandingsData,
  TournamentStanding,
} from "./types";

/**
 * ESPN halka açık spor API'si — gerçek puan durumu, fikstür, canlı skor, kadro ve resmi kulüp armaları.
 * Hiçbir değer burada uydurulmaz; kaynak yanıt vermezse hata yukarı fırlatılır ve arayüz bunu gösterir.
 */

const SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const SITE_V2 = "https://site.api.espn.com/apis/v2/sports/soccer";
const WEB = "https://site.web.api.espn.com/apis/site/v2/sports/soccer";

/**
 * Trabzonspor'un yer alabileceği tüm kulvarlar. Fikstürde maç bulunan kulvarlar otomatik
 * algılanır; lig, Avrupa kupası veya eleme turuna geçişte doğru tablo kendiliğinden eklenir.
 */
const COMPETITIONS = [
  { slug: "tur.1", label: "Trendyol Süper Lig" },
  { slug: "tur.2", label: "TFF 1. Lig" },
  { slug: "uefa.champions", label: "UEFA Şampiyonlar Ligi" },
  { slug: "uefa.europa", label: "UEFA Avrupa Ligi" },
  { slug: "uefa.europa.conf", label: "UEFA Konferans Ligi" },
  { slug: "uefa.champions_qual", label: "UEFA Şampiyonlar Ligi Elemeleri" },
  { slug: "uefa.europa_qual", label: "UEFA Avrupa Ligi Elemeleri" },
  { slug: "uefa.europa.conf_qual", label: "UEFA Konferans Ligi Elemeleri" },
] as const;

export const COMPETITION_LABELS: Record<string, string> = Object.fromEntries(
  COMPETITIONS.map((c) => [c.slug, c.label]),
);

/** ESPN'in ASCII'ye çevirdiği Süper Lig kulüp adlarının Türkçe yazımı (kimlik bazlı) */
const TR_NAMES: Record<string, string> = {
  "997": "Trabzonspor",
  "432": "Galatasaray",
  "436": "Fenerbahçe",
  "1895": "Beşiktaş",
  "132335": "Amed",
  "6870": "Kasımpaşa",
  "995": "Kocaelispor",
  "7914": "İstanbul Başakşehir",
  "132334": "Çorum FK",
  "789": "Göztepe",
  "7656": "Çaykur Rizespor",
  "19267": "Erzurum BB",
  "996": "Gençlerbirliği",
  "9078": "Alanyaspor",
  "7648": "Konyaspor",
  "20070": "Gaziantep FK",
  "11429": "Samsunspor",
  "20729": "Eyüpspor",
};

const trName = (id: string, fallback?: string) => TR_NAMES[id] ?? fallback ?? "—";

const COUNTRIES_TR: Record<string, string> = {
  Cameroon: "Kamerun",
  Montenegro: "Karadağ",
  Ukraine: "Ukrayna",
  "Cape Verde Islands": "Yeşil Burun",
  "Cape Verde": "Yeşil Burun",
  Nigeria: "Nijerya",
  Brazil: "Brezilya",
  France: "Fransa",
  Morocco: "Fas",
  Albania: "Arnavutluk",
  Egypt: "Mısır",
  "Guinea-Bissau": "Gine-Bissau",
  Portugal: "Portekiz",
  Argentina: "Arjantin",
  Senegal: "Senegal",
  Ghana: "Gana",
  Serbia: "Sırbistan",
  Germany: "Almanya",
  Spain: "İspanya",
  England: "İngiltere",
  Netherlands: "Hollanda",
  Denmark: "Danimarka",
  Slovenia: "Slovenya",
  Croatia: "Hırvatistan",
  Greece: "Yunanistan",
  Hungary: "Macaristan",
  Ivory_Coast: "Fildişi Sahili",
};

/* ------------------------------------------------------------------ */
/* Ham ESPN tipleri (yalnızca kullandığımız alanlar)                    */
/* ------------------------------------------------------------------ */

interface RawLogo {
  href: string;
  rel?: string[];
}
interface RawTeam {
  id: string;
  displayName?: string;
  abbreviation?: string;
  logos?: RawLogo[];
  logo?: string;
}
interface RawScore {
  displayValue?: string;
  value?: number;
}
interface RawCompetitor {
  homeAway: "home" | "away";
  team: RawTeam;
  score?: string | RawScore;
}
interface RawEvent {
  id: string;
  date: string;
  competitions?: {
    venue?: { fullName?: string; address?: { city?: string } };
    competitors?: RawCompetitor[];
    broadcasts?: { names?: string[] }[];
    status?: {
      displayClock?: string;
      period?: number;
      type?: { state?: MatchState; shortDetail?: string; detail?: string };
    };
  }[];
}

const logoOf = (t: RawTeam): string | null =>
  t.logos?.find((l) => l.rel?.includes("default"))?.href ?? t.logos?.[0]?.href ?? t.logo ?? null;

function parseScore(score: RawCompetitor["score"], state: MatchState): number | null {
  if (state === "pre" || score == null) return null;
  const raw = typeof score === "object" ? (score.displayValue ?? score.value) : score;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function statusText(state: MatchState, short?: string, detail?: string): string {
  if (state === "pre") return "Başlamadı";
  const s = (short ?? detail ?? "").toUpperCase();
  if (state === "in") {
    if (s.includes("HT") || s.includes("HALF")) return "Devre Arası";
    if (s.includes("ET")) return "Uzatmalar";
    return "Devam Ediyor";
  }
  if (s.includes("AET")) return "Maç Sonu (Uzt.)";
  if (s.includes("PEN")) return "Maç Sonu (Pen.)";
  return "Maç Sonu";
}

/** Türkçe maç fazı — ESPN durum + devre numarasından üretilir. */
export function phaseOf(
  state: MatchState,
  period: number | null,
  short?: string,
  detail?: string,
): string {
  if (state === "pre") return "Başlamadı";
  const s = (short ?? detail ?? "").toUpperCase();
  const pen = s.includes("PEN");
  const extra = s.includes("ET") || s.includes("AET") || (period ?? 0) > 2;
  if (state === "post") {
    if (pen) return "Maç Sonu (Penaltılar)";
    if (extra) return "Maç Sonu (Uzatmalar)";
    return "Maç Sonu";
  }
  if (pen || period === 5) return "Seri Penaltılar";
  if (s.includes("HT") || s.includes("HALF")) return "Devre Arası";
  if (extra) return period === 3 ? "Uzatma 1. Yarı" : "Uzatma 2. Yarı";
  if (period === 2) return "İkinci Yarı";
  if (period === 1) return "İlk Yarı";
  return "Devam Ediyor";
}

function mapEvent(ev: RawEvent, slug: string, label: string): Fixture | null {
  const c = ev.competitions?.[0];
  const home = c?.competitors?.find((x) => x.homeAway === "home");
  const away = c?.competitors?.find((x) => x.homeAway === "away");
  if (!c || !home || !away) return null;

  const state: MatchState = c.status?.type?.state ?? "pre";
  const side = (x: RawCompetitor): Side => ({
    id: x.team.id,
    name: trName(x.team.id, x.team.displayName),
    abbr: x.team.abbreviation ?? "",
    logo: logoOf(x.team),
    score: parseScore(x.score, state),
  });
  const h = side(home);
  const a = side(away);
  const tsIsHome = h.id === TS_ID;

  let outcome: Fixture["outcome"] = null;
  if (state === "post" && h.score != null && a.score != null) {
    const gf = tsIsHome ? h.score : a.score;
    const ga = tsIsHome ? a.score : h.score;
    outcome = gf > ga ? "W" : gf < ga ? "L" : "D";
  }

  const espnTv = c.broadcasts?.flatMap((b) => b.names ?? []).filter(Boolean);

  return {
    id: ev.id,
    leagueSlug: slug,
    competition: label,
    date: ev.date,
    venue: c.venue?.fullName ?? null,
    city: c.venue?.address?.city ?? null,
    state,
    clock: state === "in" ? (c.status?.displayClock ?? null) : null,
    statusText: statusText(state, c.status?.type?.shortDetail, c.status?.type?.detail),
    period: c.status?.period ?? null,
    phase: phaseOf(state, c.status?.period ?? null, c.status?.type?.shortDetail, c.status?.type?.detail),
    home: h,
    away: a,
    tsIsHome,
    outcome,
    tv: espnTv?.length
      ? { channel: Array.from(new Set(espnTv)).join(" / "), confirmed: true, note: null }
      : null,
  };
}

/* ------------------------------------------------------------------ */
/* Fikstür + sonuçlar                                                   */
/* ------------------------------------------------------------------ */

export async function getFixtures(): Promise<FixturesData> {
  return cached("espn:fixtures", 5 * 60_000, async () => {
    const all = new Map<string, Fixture>();
    let leagueOk = false;

    await Promise.all(
      COMPETITIONS.map(async (c, idx) => {
        const base = `${SITE}/${c.slug}/teams/${TS_ID}/schedule`;
        const [played, upcoming] = await Promise.all([
          fetchJson<{ events?: RawEvent[] }>(base).catch(() => null),
          fetchJson<{ events?: RawEvent[] }>(`${base}?fixture=true`).catch(() => null),
        ]);
        if (idx === 0 && (played || upcoming)) leagueOk = true;
        for (const ev of [...(played?.events ?? []), ...(upcoming?.events ?? [])]) {
          const f = mapEvent(ev, c.slug, c.label);
          if (f) all.set(f.id, f);
        }
      }),
    );

    if (!leagueOk) throw new Error("ESPN fikstür kaynağına ulaşılamadı");

    // Ziraat Türkiye Kupası (ESPN dışı kaynak) — varsa otomatik eklenir
    for (const f of await getCupFixtures().catch(() => [])) all.set(f.id, f);

    const list = Array.from(all.values());
    const byDate = (a: Fixture, b: Fixture) => +new Date(a.date) - +new Date(b.date);

    return {
      live: list.find((f) => f.state === "in") ?? null,
      next: list.filter((f) => f.state === "pre").sort(byDate).slice(0, 6),
      recent: list
        .filter((f) => f.state === "post")
        .sort((a, b) => byDate(b, a))
        .slice(0, 14),
    };
  });
}

/** Anlık skor: skor tahtası uçları 15 sn önbellekli — canlı maçta dakika ve skor buradan gelir. */
export async function getLiveFixture(): Promise<Fixture | null> {
  return cached("espn:live", 15_000, async () => {
    const results = await Promise.allSettled(
      COMPETITIONS.map((c) =>
        fetchJson<{ events?: RawEvent[] }>(`${SITE}/${c.slug}/scoreboard`, { timeoutMs: 8000 }).then(
          (d) => ({ c, events: d.events ?? [] }),
        ),
      ),
    );
    if (results.every((r) => r.status === "rejected")) {
      throw new Error("ESPN canlı skor kaynağına ulaşılamadı");
    }
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const ev of r.value.events) {
        const f = mapEvent(ev, r.value.c.slug, r.value.c.label);
        if (f && f.state === "in" && (f.home.id === TS_ID || f.away.id === TS_ID)) return f;
      }
    }
    return null;
  });
}

/* ------------------------------------------------------------------ */
/* Puan durumu                                                          */
/* ------------------------------------------------------------------ */



interface RawStandingEntry {
  team: RawTeam;
  note?: { color?: string; description?: string };
  stats: { name: string; value?: number }[];
}

interface RawStandings {
  seasons?: { seasonYears?: string; displayName?: string }[];
  children?: {
    name?: string;
    standings?: { entries?: RawStandingEntry[] };
  }[];
}

function mapStandingRows(entries: RawStandingEntry[] | undefined): StandingRow[] {
  return (entries ?? [])
    .map((e) => {
      const s = (n: string) => e.stats.find((x) => x.name === n)?.value ?? 0;
      return {
        rank: s("rank"),
        teamId: e.team.id,
        team: trName(e.team.id, e.team.displayName),
        logo: logoOf(e.team),
        played: s("gamesPlayed"),
        won: s("wins"),
        drawn: s("ties"),
        lost: s("losses"),
        gf: s("pointsFor"),
        ga: s("pointsAgainst"),
        gd: s("pointDifferential"),
        points: s("points"),
        zone: e.note?.description ?? null,
        zoneColor: e.note?.color ?? null,
      } satisfies StandingRow;
    })
    .sort((a, b) => a.rank - b.rank);
}

async function fetchStanding(slug: string, competition: string): Promise<TournamentStanding> {
  const d = await fetchJson<RawStandings>(`${SITE_V2}/${slug}/standings`);
  const groups = (d.children ?? [])
    .map((c) => ({ name: c.name ?? competition, rows: mapStandingRows(c.standings?.entries) }))
    .filter((g) => g.rows.length);
  if (!groups.length) throw new Error(`${competition} tablosu boş döndü`);
  return { slug, competition, season: d.seasons?.[0]?.seasonYears ?? "", groups };
}

/** Süper Lig tablosu (ana sayfa özeti için) */
export async function getStandings(): Promise<StandingsData> {
  return cached("espn:standings", 5 * 60_000, async () => {
    const t = await fetchStanding("tur.1", "Trendyol Süper Lig");
    return { season: t.season, rows: t.groups[0]?.rows ?? [] };
  });
}

/**
 * Trabzonspor'un şu an mücadele ettiği TÜM kulvarların (Süper Lig, UEFA Konferans Ligi…)
 * güncel puan durumları. Kulvarlar fikstürden otomatik algılanır; lig/avrupa geçişlerinde
 * doğru tablo yansır.
 */
export async function getTournamentStandings(): Promise<TournamentStanding[]> {
  return cached("espn:tournaments", 5 * 60_000, async () => {
    const fx = await getFixtures();
    const now = Date.now();
    const windowMs = 120 * 24 * 3600_000; // yalnızca güncel dönem: son/önümüzdeki ~4 ay
    const comps = new Map<string, { label: string; latest: number }>();
    for (const f of [...(fx.live ? [fx.live] : []), ...fx.next, ...fx.recent]) {
      const t = +new Date(f.date);
      if (Math.abs(t - now) > windowMs) continue; // elendiği/bitirdiği eski turnuvalar düşer
      const prev = comps.get(f.leagueSlug);
      comps.set(f.leagueSlug, { label: f.competition, latest: Math.max(prev?.latest ?? 0, t) });
    }

    // Aktif lig: Trabzonspor hangi ulusal ligde maç yapıyorsa o (küme düşme/çıkma durumunda otomatik değişir)
    const nationalSlugs = ["tur.1", "tur.2"];
    const activeNational = nationalSlugs.find((slug) => comps.has(slug)) ?? "tur.1";
    for (const slug of nationalSlugs) if (slug !== activeNational) comps.delete(slug);

    // Eleme usulü kupa (puan tablosu yok) tablo listesine eklenmez
    const slugs = [activeNational, ...[...comps.keys()].filter((k) => k !== activeNational && k !== CUP_SLUG)];
    const settled = await Promise.all(
      slugs.map((slug) =>
        fetchStanding(slug, comps.get(slug)?.label ?? COMPETITION_LABELS[slug] ?? slug).catch(() => null),
      ),
    );
    // Avrupa kupalarında Trabzonspor artık tabloda yoksa (elenmiş/çıkmış) o tablo gösterilmez
    const list = settled.filter((x): x is TournamentStanding =>
      x !== null && (x.slug === activeNational || x.groups.some((g) => g.rows.some((r) => r.teamId === TS_ID))),
    );
    if (!list.length) throw new Error("Hiçbir kulvar tablosu alınamadı");
    return list;
  });
}

/* ------------------------------------------------------------------ */
/* A Takım kadrosu                                                      */
/* ------------------------------------------------------------------ */

interface RawRoster {
  season?: { displayName?: string };
  athletes?: {
    id: string;
    displayName: string;
    jersey?: string;
    age?: number;
    citizenship?: string;
    position?: { abbreviation?: string };
  }[];
}

const POS: Record<string, Position> = { G: "G", D: "D", M: "M", F: "F" };

export async function getSquad(): Promise<SquadData> {
  return cached("espn:squad", 30 * 60_000, async () => {
    const [roster, coach] = await Promise.all([
      fetchJson<RawRoster>(`${SITE}/tur.1/teams/${TS_ID}/roster`, { timeoutMs: 15_000 }),
      getCoach().catch(() => null),
    ]);
    const athletes = roster.athletes ?? [];
    if (!athletes.length) throw new Error("Kadro verisi boş döndü");

    const players: Player[] = athletes.map((a) => {
      const jersey = a.jersey != null && a.jersey !== "" ? Number(a.jersey) : null;
      return {
        id: a.id,
        name: a.displayName,
        jersey: Number.isFinite(jersey) ? jersey : null,
        position: POS[a.position?.abbreviation ?? ""] ?? "M",
        age: a.age ?? null,
        nationality: a.citizenship ? (COUNTRIES_TR[a.citizenship] ?? a.citizenship) : null,
      };
    });

    return {
      season: roster.season?.displayName?.replace(/\s*Turkish Super Lig/i, "").trim() ?? "",
      coach,
      players,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Maç kadrosu (ilk 11 + yedekler)                                      */
/* ------------------------------------------------------------------ */

interface RawSummary {
  rosters?: {
    homeAway: "home" | "away";
    team: { id: string };
    formation?: string;
    roster?: {
      starter?: boolean;
      jersey?: string;
      formationPlace?: string;
      position?: { abbreviation?: string };
      athlete: { displayName: string };
    }[];
  }[];
}

export async function getLineup(fixture: Fixture | null | undefined): Promise<LineupData | null> {
  if (!fixture) return null;
  return cached(`espn:lineup:${fixture.id}`, 5 * 60_000, async () => {
    const d = await fetchJson<RawSummary>(
      `${WEB}/${fixture.leagueSlug}/summary?event=${fixture.id}`,
      { timeoutMs: 12_000 },
    );
    const mine = d.rosters?.find((r) => r.team.id === TS_ID);
    const other = d.rosters?.find((r) => r.team.id !== TS_ID);
    if (!mine?.roster?.length) return null;

    const map = (x: NonNullable<typeof mine.roster>[number]): LineupPlayer => ({
      jersey: x.jersey ?? null,
      name: x.athlete.displayName,
      pos: x.position?.abbreviation ?? null,
      place: x.formationPlace ? Number(x.formationPlace) : null,
    });
    const starters = mine.roster
      .filter((x) => x.starter)
      .map(map)
      .sort((a, b) => (a.place ?? 99) - (b.place ?? 99));
    if (!starters.length) return null;

    return {
      fixtureId: fixture.id,
      title: `${fixture.home.name} - ${fixture.away.name}`,
      date: fixture.date,
      state: fixture.state,
      formation: mine.formation ?? null,
      opponentFormation: other?.formation ?? null,
      starters,
      subs: mine.roster.filter((x) => !x.starter).map(map),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Maç detayı — resmî ilk 11 + yedekler + oyuncu bazlı istatistik + olaylar */
/* ------------------------------------------------------------------ */

interface RawSummaryFull {
  rosters?: {
    homeAway: "home" | "away";
    team: { id: string };
    formation?: string;
    roster?: {
      active?: boolean;
      starter?: boolean;
      jersey?: string;
      formationPlace?: string;
      subbedIn?: boolean;
      subbedOut?: boolean;
      position?: { abbreviation?: string };
      athlete: { id: string; displayName: string; shortName?: string; headshot?: { href?: string } };
      stats?: { name: string; value?: number; displayValue?: string }[];
    }[];
  }[];
  keyEvents?: {
    type?: { text?: string; type?: string };
    text?: string;
    shortText?: string;
    clock?: { displayValue?: string };
    team?: { id?: string };
    participants?: { athlete?: { displayName?: string } }[];
  }[];
}

export interface MatchPlayerFull {
  id: string; // ESPN athlete id — maçın resmî kadro kaydındaki kimlik
  jersey: string | null;
  name: string;
  position: string | null;
  /** Opta/ESPN resmî diziliş slotu (1 = kaleci). Saha yerleşimi buna göre yapılır. */
  place: number | null;
  starter: boolean;
  subbedIn: boolean;
  subbedOut: boolean;
  stats: Record<string, number>;
  headshot: string | null;
  /** Resmî kulüp fotoğrafı (yalnızca Trabzonspor oyuncuları) */
  photo: string | null;
  /** Maça özel hesaplanan reyting */
  rating: number;
}

/** Maç detayı: yalnızca Trabzonspor'un sahaya çıkan kadrosu, skor ve Türkçe olaylar. */
export interface MatchDetail {
  fixture: Fixture;
  tsLineup: { formation: string | null; starters: MatchPlayerFull[]; subs: MatchPlayerFull[] } | null;
  keyEvents: MatchEvent[];
}

const NUM_STATS = [
  "totalGoals",
  "goalAssists",
  "shotsOnTarget",
  "totalShots",
  "saves",
  "goalsConceded",
  "cleanSheet",
  "yellowCards",
  "redCards",
  "foulsCommitted",
  "foulsSuffered",
  "offsides",
  "shotsFaced",
];

function mapEventPlayers(r: NonNullable<RawSummaryFull["rosters"]>[number]): MatchPlayerFull[] {
  return (r.roster ?? [])
    .filter((a) => a.active !== false)
    .map((a) => {
      const stats: Record<string, number> = {};
      for (const st of a.stats ?? []) {
        if (st.value != null && NUM_STATS.includes(st.name)) stats[st.name] = st.value;
      }
      const position = a.position?.abbreviation ?? null;
      return {
        id: a.athlete.id,
        jersey: a.jersey ?? null,
        name: a.athlete.displayName,
        position,
        place: a.formationPlace ? Number(a.formationPlace) : null,
        starter: Boolean(a.starter),
        subbedIn: Boolean(a.subbedIn),
        subbedOut: Boolean(a.subbedOut),
        stats,
        headshot: a.athlete.headshot?.href ?? null,
        photo: null,
        rating: computeMatchRating(stats, position === "G"),
      };
    });
}


/* --------------- Maç olaylarını akıcı Türkçeye çevirme --------------- */

const EVENT_LABEL: Record<string, string> = {
  goal: "Gol",
  "goal---header": "Kafa Golü",
  "goal---free-kick": "Serbest Vuruş Golü",
  "goal---volley": "Gol",
  "own-goal": "Kendi Kalesine Gol",
  "penalty---scored": "Penaltı Golü",
  "penalty---missed": "Kaçan Penaltı",
  "penalty---saved": "Kurtarılan Penaltı",
  "yellow-card": "Sarı Kart",
  "red-card": "Kırmızı Kart",
  "second-yellow": "İkinci Sarıdan Kırmızı",
  "yellow-red-card": "İkinci Sarıdan Kırmızı",
  substitution: "Oyuncu Değişikliği",
  kickoff: "Başlama Vuruşu",
  halftime: "Devre Arası",
  "start-2nd-half": "İkinci Yarı Başladı",
  "end-regular-time": "Normal Süre Sona Erdi",
  "start-extra-time": "Uzatmalar Başladı",
  "end-extra-time": "Uzatmalar Sona Erdi",
  "penalty-shootout": "Seri Penaltılar",
  "full-time": "Maç Sonu",
  "start-delay": "Oyun Durdu",
  "end-delay": "Oyun Yeniden Başladı",
  var: "VAR İncelemesi",
  offside: "Ofsayt",
};

const GOAL_TYPES = new Set(["goal", "goal---header", "goal---free-kick", "goal---volley", "penalty---scored", "own-goal"]);

function trEvent(k: NonNullable<RawSummaryFull["keyEvents"]>[number]): MatchEvent {
  const type = (k.type?.type ?? "").toLocaleLowerCase("en-US");
  // Bilinmeyen yeni bir tür gelirse İngilizce metin gösterilmez
  const label = EVENT_LABEL[type] ?? (type.startsWith("goal") ? "Gol" : type.startsWith("penalty") ? "Penaltı" : "Maç Olayı");
  const names = (k.participants ?? []).map((p) => p.athlete?.displayName).filter(Boolean) as string[];
  const [p0 = "", p1 = ""] = names;
  let text: string;
  switch (true) {
    case type === "own-goal":
      text = p0 ? `${p0} kendi kalesine gol attı` : label;
      break;
    case type === "goal---header":
      text = p0 ? `${p0} kafayla gol attı` : label;
      break;
    case type === "goal---free-kick":
      text = p0 ? `${p0} serbest vuruştan gol attı` : label;
      break;
    case type === "penalty---scored":
      text = p0 ? `${p0} penaltıdan gol attı` : label;
      break;
    case type === "penalty---missed":
      text = p0 ? `${p0} penaltı kaçırdı` : label;
      break;
    case type === "penalty---saved":
      text = p0 ? `${p0} penaltı kurtardı` : label;
      break;
    case type.startsWith("goal"):
      text = p0 ? `${p0} gol attı` : label;
      break;
    case type === "yellow-card":
      text = p0 ? `${p0} sarı kart gördü` : label;
      break;
    case type === "red-card":
      text = p0 ? `${p0} kırmızı kart gördü` : label;
      break;
    case type === "second-yellow" || type === "yellow-red-card":
      text = p0 ? `${p0} ikinci sarıdan kırmızı kart gördü` : label;
      break;
    case type === "substitution":
      // ESPN sırası: [oyuna giren, oyundan çıkan]
      text = p0 && p1 ? `${p0} oyuna girdi, ${p1} oyundan çıktı` : p0 ? `${p0} oyuna girdi` : label;
      break;
    case type === "var":
      text = p0 ? `${p0} ile ilgili pozisyon VAR'da incelendi` : label;
      break;
    default:
      text = label;
  }
  return { minute: k.clock?.displayValue ?? "", label, text, isGoal: GOAL_TYPES.has(type) };
}

/**
 * Maç detayı — resmî maç kimliği (event/fixture ID) ile ESPN özetinden.
 * İlk 11, kaynakta verilen sırayla ve resmî diziliş slotlarıyla korunur (forma numarasına
 * göre yeniden sıralanmaz); bu, yanlış oyuncu/yanlış pozisyon gösterimini engeller.
 * Biten maçlar 6 saat, canlı maçlar 15 sn, oynanacak maçlar 5 dk önbelleklenir.
 */
export async function getMatchDetail(fixture: Fixture): Promise<MatchDetail> {
  const ttl = fixture.state === "post" ? 6 * 3600_000 : fixture.state === "in" ? 15_000 : 5 * 60_000;
  return cached(`match:${fixture.leagueSlug}:${fixture.id}:${fixture.state}`, ttl, async () => {
    if (fixture.leagueSlug === CUP_SLUG) {
      // Kupa maçları için resmî oyuncu kadrosu kaynağı yok — kadro uydurulmaz
      return { fixture, tsLineup: null, keyEvents: [] };
    }
    const d = await fetchJson<RawSummaryFull>(
      `${WEB}/${fixture.leagueSlug}/summary?event=${encodeURIComponent(fixture.id)}`,
      { timeoutMs: 12_000 },
    );

    const ts = d.rosters?.find((r) => r.team.id === TS_ID);
    const tsPlayers = ts ? mapEventPlayers(ts) : [];
    const byPlace = (a: MatchPlayerFull, b: MatchPlayerFull) => (a.place ?? 99) - (b.place ?? 99);

    return {
      fixture,
      tsLineup: ts && tsPlayers.some((p) => p.starter)
        ? {
            formation: ts.formation ?? null,
            starters: tsPlayers.filter((p) => p.starter).sort(byPlace),
            subs: tsPlayers.filter((p) => !p.starter),
          }
        : null,
      keyEvents: (d.keyEvents ?? []).slice(0, 40).map(trEvent),
    };
  });
}
