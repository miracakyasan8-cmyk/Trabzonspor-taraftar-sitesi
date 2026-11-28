import type { StoreData } from "./store-types";

export type MatchState = "pre" | "in" | "post";

export interface Side {
  id: string;
  name: string;
  abbr: string;
  logo: string | null;
  score: number | null;
}

export interface Broadcast {
  channel: string | null;
  /** true: kanal bir kaynaktan doğrulandı — false: yalnızca lig yayıncısı biliniyor */
  confirmed: boolean;
  note: string | null;
}

export interface Fixture {
  id: string;
  leagueSlug: string;
  competition: string;
  date: string; // ISO (UTC)
  venue: string | null;
  city: string | null;
  state: MatchState;
  clock: string | null;
  statusText: string;
  /** ESPN devre numarası: 1 ilk yarı, 2 ikinci yarı, 3-4 uzatma, 5 seri penaltılar */
  period: number | null;
  /** Türkçe maç fazı: İlk Yarı, Devre Arası, İkinci Yarı, Uzatmalar, Maç Sonu… */
  phase: string;
  home: Side;
  away: Side;
  tsIsHome: boolean;
  outcome: "W" | "D" | "L" | null;
  tv: Broadcast | null;
}

export interface FixturesData {
  live: Fixture | null;
  next: Fixture[];
  recent: Fixture[];
}

export interface StandingRow {
  rank: number;
  teamId: string;
  team: string;
  logo: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  zone: string | null;
  zoneColor: string | null;
}

export interface StandingsData {
  season: string;
  rows: StandingRow[];
}

export interface StandingGroup {
  name: string;
  rows: StandingRow[];
}

/** Aktif kulvarın (lig / turnuva) tam puan durumu — ESPN standings */
export interface TournamentStanding {
  slug: string;
  competition: string;
  season: string;
  groups: StandingGroup[];
}

export interface MatchEvent {
  minute: string;
  label: string; // Türkçe olay türü: Gol, Sarı Kart, Oyuncu Değişikliği…
  text: string; // Türkçe olay açıklaması
  isGoal: boolean;
}

export type Position = "G" | "D" | "M" | "F";

export interface Player {
  id: string;
  name: string;
  jersey: number | null;
  position: Position;
  age: number | null;
  nationality: string | null;
}

export interface Coach {
  name: string;
  source: string;
  url: string;
}

export interface SquadData {
  season: string;
  coach: Coach | null;
  players: Player[];
}

export interface LineupPlayer {
  jersey: string | null;
  name: string;
  pos: string | null;
  place: number | null;
}

export interface LineupData {
  fixtureId: string;
  title: string;
  date: string;
  state: MatchState;
  formation: string | null;
  opponentFormation: string | null;
  starters: LineupPlayer[];
  subs: LineupPlayer[];
}

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  sourceDomain: string | null;
  publishedAt: string;
  category: "genel" | "transfer";
}

export interface NewsData {
  items: NewsItem[];
  provider: string;
  since: string;
  total: number;
  failedWindows: number;
  /** Dinamik yıl arşivi: 2026'dan içinde bulunulan yıla kadar */
  years: number[];
}

export interface SocialPost {
  id: string;
  url: string;
  thumbnail: string | null;
  caption: string;
  timestamp: string | null;
  kind: "video" | "image" | "carousel";
}

export interface SocialProfile {
  platform: "instagram" | "tiktok";
  handle: string;
  url: string;
  name: string | null;
  avatar: string | null;
  followers: number | null;
  likes: number | null;
  mediaCount: number | null;
  items: SocialPost[];
  via: "api" | "embed";
  error: string | null;
}

export interface SocialData {
  instagram: SocialProfile;
  tiktok: SocialProfile;
}

/** Canlı skorun çoklu kaynak doğrulaması */
export interface SourceCheck {
  name: string;
  status: "confirmed" | "no-data" | "conflict" | "error";
  detail: string;
  url: string | null;
}

export interface LiveVerification {
  confirmed: boolean;
  checks: SourceCheck[];
  checkedAt: string;
}

export type SectionKey = "fixtures" | "standings" | "squad" | "news" | "social" | "lineup" | "store";

/** Yenileme döngüsünde taranan her kaynağın raporu */
export interface SyncSource {
  key: SectionKey | "cup";
  label: string;
  source: string;
  ok: boolean;
  /** Canlı kaynak yanıt vermedi; en son başarılı veri sunuluyor */
  stale: boolean;
  staleSince: string | null;
  detail: string;
}

export interface PortalData {
  updatedAt: string;
  durationMs: number;
  fixtures: FixturesData | null;
  standings: StandingsData | null;
  squad: SquadData | null;
  news: NewsData | null;
  social: SocialData | null;
  lineup: LineupData | null;
  store: StoreData | null;
  tournaments: TournamentStanding[] | null;
  sources: SyncSource[];
  /** Eski veriyle sunulan bölüm sayısı (0 = tümü canlı) */
  staleCount: number;
  errors: Partial<Record<SectionKey, string>>;
}
