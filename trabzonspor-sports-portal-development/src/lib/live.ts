import { cached, isStale } from "./cache";
import { getLiveFixture, getMatchDetail } from "./espn";
import { rememberFinished } from "./finished";
import { invalidatePrefix } from "./cache";
import { crossCheck, TSDB_SOURCE_URL } from "./livescore";
import type { Fixture, LiveVerification, SourceCheck } from "./types";
import type { MatchDetail, MatchPlayerFull } from "./espn";
import { getLiveSquad } from "./squad";

/**
 * Canlı Maç Merkezi verisi.
 * - ESPN resmî skor tahtası: dakika, skor, devre (gerçek zamanlı).
 * - TheSportsDB: ikinci kaynak; skor/durum çapraz doğrulaması.
 * - Aynı anda oynanan maç yoksa `live: null` döner; arayüz geri sayıma döner.
 * Kaynak hatasında önbellek katmanı son başarılı anlık görüntüyü korur (stale işaretli).
 */

const liveState = () => {
  const g = globalThis as unknown as { __f61LiveState?: { lastLive: Fixture | null } };
  return (g.__f61LiveState ??= { lastLive: null });
};

export interface LiveSnapshot {
  live: Fixture | null;
  verification: LiveVerification | null;
  stale: boolean;
  updatedAt: string;
}

async function verify(fixture: Fixture): Promise<LiveVerification> {
  const checks: SourceCheck[] = [
    {
      name: "ESPN resmî maç verisi",
      status: "confirmed",
      detail: `${fixture.phase} • ${fixture.clock ?? fixture.statusText} • ${fixture.home.score ?? 0}-${fixture.away.score ?? 0}`,
      url: "https://www.espn.com/soccer/",
    },
  ];

  try {
    const tsdb = await crossCheck(fixture.home, fixture.away, fixture.date);
    if (!tsdb) {
      checks.push({
        name: "TheSportsDB",
        status: "no-data",
        detail: "Bu maç için kayıt bulunamadı; yalnızca ESPN verisi kullanılıyor.",
        url: TSDB_SOURCE_URL,
      });
    } else if (tsdb.homeScore != null && tsdb.awayScore != null) {
      const tsHome = /trabzon/i.test(tsdb.home);
      const espnHomeScore = fixture.home.score ?? 0;
      const espnAwayScore = fixture.away.score ?? 0;
      const otherHome = tsHome ? tsdb.homeScore : tsdb.awayScore;
      const otherAway = tsHome ? tsdb.awayScore : tsdb.homeScore;
      const agree = otherHome === espnHomeScore && otherAway === espnAwayScore;
      checks.push({
        name: "TheSportsDB",
        status: agree ? "confirmed" : "conflict",
        detail: agree
          ? `Skor doğrulandı (${otherHome}-${otherAway})`
          : `Skor farklı: ${otherHome}-${otherAway} (ESPN: ${espnHomeScore}-${espnAwayScore}). ESPN esas alınıyor.`,
        url: TSDB_SOURCE_URL,
      });
    } else {
      checks.push({
        name: "TheSportsDB",
        status: "no-data",
        detail: "Kaynak henüz skor yayımlamadı; ESPN verisi esas alınıyor.",
        url: TSDB_SOURCE_URL,
      });
    }
  } catch (e) {
    checks.push({
      name: "TheSportsDB",
      status: "error",
      detail: e instanceof Error ? e.message : "İkinci kaynağa ulaşılamadı",
      url: TSDB_SOURCE_URL,
    });
  }

  return {
    confirmed: checks.every((c) => c.status !== "conflict") && checks.some((c) => c.status === "confirmed"),
    checks,
    checkedAt: new Date().toISOString(),
  };
}

/** Ana sayfa ve canlı merkez için hafif anlık görüntü (sunucuda 12 sn önbellek). */
export async function getLiveSnapshot(): Promise<LiveSnapshot> {
  return cached("live:snapshot", 12_000, async () => {
    const live = await getLiveFixture();
    // Maç canlıdan çıktı: son bilinen hali arşive taşınır, takvim yeniden okunur (ESPN gecikmesini kapatır)
    const state = liveState();
    if (state.lastLive && !live) {
      rememberFinished(state.lastLive);
      invalidatePrefix("espn:fixtures");
      invalidatePrefix("espn:tournaments");
    }
    state.lastLive = live;
    const stale = isStale("espn:live");
    return {
      // Faz (İlk Yarı / Devre Arası / İkinci Yarı) ESPN durum metninden zaten doğru hesaplanır
      live,
      verification: live ? await verify(live) : null,
      stale,
      updatedAt: new Date().toISOString(),
    } satisfies LiveSnapshot;
  }, { staleMaxAgeMs: 6 * 3600_000 });
}

/**
 * Trabzonspor oyuncularını resmî kulüp kadrosuyla zenginleştirir: güncel resmî fotoğraf,
 * kulüpteki yazım ve forma numarası. Eşleştirme yalnızca ESPN oyuncu kimliğiyle yapılır.
 */
async function enrichPhotos(detail: MatchDetail): Promise<MatchDetail> {
  if (!detail.tsLineup) return detail;
  try {
    const squad = await getLiveSquad();
    const byId = new Map(squad.players.filter((p) => p.espnId).map((p) => [p.espnId as string, p]));
    const enrich = (p: MatchPlayerFull): MatchPlayerFull => {
      const official = byId.get(p.id);
      return official
        ? { ...p, name: official.name, jersey: official.jersey != null ? String(official.jersey) : p.jersey, photo: official.photo ?? p.headshot }
        : { ...p, photo: p.photo ?? p.headshot };
    };
    return {
      ...detail,
      tsLineup: {
        ...detail.tsLineup,
        starters: detail.tsLineup.starters.map(enrich),
        subs: detail.tsLineup.subs.map(enrich),
      },
    };
  } catch {
    return detail;
  }
}

/** Canlı merkez penceresi: iki takımın kadrosu, yedekler, olaylar ve doğrulama. */
export async function getLiveMatchCenter(eventId: string) {
  const snapshot = await getLiveSnapshot();
  const fixture = snapshot.live?.id === eventId ? snapshot.live : null;
  if (!fixture) {
    // Maç bitti/başlamadı olabilir — arşivden tam detayı yine sun (fotoğraflı kadro + olaylar)
    const { loadFixtures } = await import("./portal");
    const fx = await loadFixtures();
    const found = [...(fx.live ? [fx.live] : []), ...fx.recent, ...fx.next].find((f) => f.id === eventId);
    if (!found) throw new Error("Maç bulunamadı");
    const detail = await enrichPhotos(await getMatchDetail(found));
    return { ...detail, verification: null, stale: snapshot.stale, updatedAt: snapshot.updatedAt };
  }
  const detail = await enrichPhotos(await getMatchDetail(fixture));
  return { ...detail, verification: snapshot.verification, stale: snapshot.stale, updatedAt: snapshot.updatedAt };
}
