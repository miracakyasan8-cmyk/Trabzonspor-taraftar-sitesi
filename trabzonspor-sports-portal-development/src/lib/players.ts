import { cached } from "./cache";
import { fetchJson } from "./http";
import { getLiveSquad, type EnrichedPlayer } from "./squad";
import { getWikiPlayer, tmSearchUrl } from "./wiki";

/**
 * Oyuncu mini profili:
 * - Kimlik, forma numarası ve fotoğraf → Trabzonspor Kulübü'nün resmî kadro sayfası
 * - İstatistikler → ESPN Core API, YALNIZCA Trabzonspor formasıyla oynanan resmî lig maçları
 * - Transfermarkt → Wikidata P2446 ile doğrulanmış gerçek profil; yoksa resmî arama sayfası
 */

export interface PlayerStats {
  appearances: number | null;
  starts: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  yellow: number | null;
  red: number | null;
}

export interface PlayerDetail {
  player: EnrichedPlayer;
  photo: string | null;
  tmUrl: string;
  tmExact: boolean;
  stats: PlayerStats | null;
  statsError: string | null;
  statsCompetition: string;
}

interface CoreStats {
  splits?: { categories?: { name: string; stats?: { name: string; value?: number }[] }[] };
}

const num = (m: Map<string, number>, k: string): number | null => {
  const v = m.get(k);
  return v == null || !Number.isFinite(v) ? null : v;
};

/** Sezon; kulüp sezonu değiştiğinde env veya ESPN kadro sezonundan otomatik alınır. */
function seasonYear() {
  const env = Number(process.env.TS_STATS_SEASON);
  if (Number.isFinite(env) && env >= 2020) return env;
  return new Date().getUTCFullYear();
}

export async function getAthleteStats(espnId: string): Promise<PlayerStats> {
  const d = await fetchJson<CoreStats>(
    `https://sports.core.api.espn.com/v2/sports/soccer/leagues/tur.1/seasons/${seasonYear()}/types/1/athletes/${espnId}/statistics?lang=en`,
    { timeoutMs: 10_000 },
  );
  const map = new Map<string, number>();
  for (const c of d.splits?.categories ?? []) {
    for (const s of c.stats ?? []) {
      if (s.value != null) map.set(`${c.name}.${s.name}`, s.value);
    }
  }
  return {
    appearances: num(map, "general.appearances"),
    starts: num(map, "general.starts"),
    minutes: num(map, "general.minutes"),
    goals: num(map, "offensive.totalGoals"),
    assists: num(map, "offensive.goalAssists"),
    yellow: num(map, "general.yellowCards"),
    red: num(map, "general.redCards"),
  };
}

export async function getPlayerDetail(id: string): Promise<PlayerDetail> {
  return cached(`player:v2:${id}`, 6 * 3600_000, async () => {
    const squad = await getLiveSquad();
    const player = squad.players.find((p) => p.id === id || p.officialId === id);
    if (!player) throw new Error("Oyuncu resmî kadroda bulunamadı");

    const wiki = await getWikiPlayer(player.name).catch(() => ({
      tmUrl: null,
      photo: null,
      label: null,
    }));
    const stats = player.espnId
      ? await getAthleteStats(player.espnId).catch(() => null)
      : null;

    return {
      player,
      photo: player.photo ?? wiki.photo,
      tmUrl: wiki.tmUrl ?? tmSearchUrl(wiki.label ?? player.name),
      tmExact: Boolean(wiki.tmUrl),
      stats,
      statsError: stats ? null : player.espnId ? "Sezon istatistiği şu an alınamadı" : "Bu oyuncu için resmî istatistik kaydı bulunamadı",
      statsCompetition: "Trendyol Süper Lig",
    } satisfies PlayerDetail;
  });
}
