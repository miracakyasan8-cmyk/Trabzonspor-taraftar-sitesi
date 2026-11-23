import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { squadObservations } from "@/db/schema";
import { cached } from "./cache";
import { getSquad as getEspnSquad } from "./espn";
import { getOfficialSquad, type OfficialPlayer } from "./official-squad";
import { ageFromBirth, getMarketInfo, type MarketInfo } from "./market";
import { isStale } from "./cache";
import type { Player, Position, SquadData } from "./types";

/**
 * Kadro, resmî kulüp A Takım listesinden üretilir. ESPN yalnızca forma numarası,
 * uyruk, yaş ve sezon istatistikleri için kimlik eşleştirmesinde kullanılır.
 *
 * Kulüp sitesinde yeni görünen oyuncu otomatik eklenir, listeden çıkan otomatik düşer.
 * Kalıcı gözlem tablosu ilk taramayı başlangıç kabul eder; sonradan gelen oyuncular
 * 14 gün boyunca "Yeni Transfer" etiketlenir (bu, resmî transfer tarihi iddiası değildir).
 */

export interface EnrichedPlayer extends Player {
  officialId: string;
  photo: string | null;
  officialUrl: string;
  espnId: string | null;
  isNew: boolean;
  /** Kulüp yeni (ör. sezonluk) fotoğraf yüklediğinde güncellenen tarih */
  photoUpdatedAt: string | null;
  /** Resmî doğum tarihi (ISO) — yaş her yenilemede buradan hesaplanır */
  birthDate: string | null;
  height: string | null;
  foot: string | null;
  joined: string | null;
  contractUntil: string | null;
  marketValue: string | null;
  marketValueEur: number | null;
  source: "Trabzonspor Kulübü" | "ESPN";
}

export interface DepartedPlayer {
  officialId: string;
  name: string;
  photo: string | null;
  lastSeenAt: string;
}

export interface EnrichedSquad extends SquadData {
  players: EnrichedPlayer[];
  /** Resmî kadro listesinden çıkan (ayrılan/sözleşmesi sona eren) oyuncular */
  departed: DepartedPlayer[];
  source: "Trabzonspor Kulübü + ESPN";
  checkedAt: string;
  newCount: number;
  tracked: boolean;
  /** Piyasa değeri/doğum tarihi kaynağı okunabildi mi */
  marketOk: boolean;
  /** Herhangi bir alt kaynak son başarılı (eski) veriyle sunuldu mu */
  stale: boolean;
}

const NEW_FOR_MS = 14 * 24 * 60 * 60_000;

export const normalizeName = (value: string) =>
  value
    .toLocaleLowerCase("en-US")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/ß/g, "ss")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const nameKey = (value: string) => normalizeName(value).replace(/\s+/g, "");
const tokens = (value: string) => normalizeName(value).split(/\s+/).filter(Boolean);

/**
 * Kulüp ve ESPN adları çoğu zaman farklı yazılır (Fabinho / Fabinho Tavares,
 * Arseniy Batagov / Arsenii Batahov...). Eşleştirme yalnızca aynı forma numarası
 * ve belirgin bir ad benzerliği varsa yapılır; yanlış oyuncu bağlanmaz.
 */
function compatibleNames(official: string, espn: string) {
  const a = tokens(official);
  const b = tokens(espn);
  const overlap = a.some((x) => b.some((y) => x === y || (x.length >= 4 && y.length >= 4 && x.slice(0, 4) === y.slice(0, 4))));
  const subset = [...a, ...b].some((x) => x.length >= 5 && a.includes(x) && b.includes(x));
  return overlap || subset;
}

function officialToPlayer(
  official: OfficialPlayer,
  espn: { id: string; name: string; jersey: number | null; position: Position; age: number | null; nationality: string | null } | undefined,
  isNew: boolean,
  photoUpdatedAt: string | null,
  market: MarketInfo | undefined,
): EnrichedPlayer {
  // Resmî kulüp doğum tarihi (gg.aa.yyyy) → ISO; yaş her çağrıda güncel hesaplanır
  const officialIso = official.birthDate
    ? official.birthDate.split(".").reverse().join("-")
    : null;
  const birthDate = officialIso ?? market?.birthDate ?? null;
  const age = ageFromBirth(birthDate) ?? market?.age ?? espn?.age ?? null;
  return {
    id: espn?.id ?? `off-${official.officialId}`,
    officialId: official.officialId,
    name: espn?.name ?? official.name,
    jersey: espn?.jersey ?? official.jersey,
    position: espn?.position ?? official.position,
    age,
    nationality: espn?.nationality ?? market?.nationality ?? null,
    photo: official.photo,
    officialUrl: official.profileUrl,
    espnId: espn?.id ?? null,
    isNew,
    photoUpdatedAt,
    birthDate,
    height: market?.height ?? null,
    foot: market?.foot ?? null,
    joined: market?.joined ?? null,
    contractUntil: market?.contractUntil ?? null,
    marketValue: market?.marketValue ?? null,
    marketValueEur: market?.marketValueEur ?? null,
    source: "Trabzonspor Kulübü",
  };
}

async function trackSquad(official: OfficialPlayer[], now: Date) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(61006725)`);
    const existing = await tx.select().from(squadObservations);
    const known = new Set(existing.map((r) => r.officialId));
    // İlk tarama başlangıç envanteridir; yalnızca sonradan gelen kimlikler "yeni" olur.
    const newUntil = existing.length ? new Date(now.getTime() + NEW_FOR_MS) : null;

    const rows = await tx
      .insert(squadObservations)
      .values(official.map((p) => ({
        officialId: p.officialId,
        firstName: p.name,
        firstSeenAt: now,
        lastSeenAt: now,
        seenCount: 1,
        newUntil: !known.has(p.officialId) ? newUntil : null,
        photoUrl: p.photo,
        photoUpdatedAt: now,
      })))
      .onConflictDoUpdate({
        target: squadObservations.officialId,
        set: {
          lastSeenAt: now,
          seenCount: sql`${squadObservations.seenCount} + 1`,
          // Kulüp yeni sezon fotoğrafı yüklediğinde adres değişir → güncelleme tarihi yenilenir
          photoUpdatedAt: sql`case when ${squadObservations.photoUrl} is distinct from excluded.photo_url then ${now.toISOString()}::timestamptz else ${squadObservations.photoUpdatedAt} end`,
          photoUrl: sql`excluded.photo_url`,
        },
      })
      .returning();

    // Kulüp listesinden çıkanlar pasif hale gelir — otomatik kadro düşüşü
    const activeIds = new Set(official.map((p) => p.officialId));
    const allRows = await tx.select().from(squadObservations);
    for (const row of allRows) {
      const shouldBeActive = activeIds.has(row.officialId);
      if (row.active !== shouldBeActive) {
        await tx.update(squadObservations).set({ active: shouldBeActive }).where(eq(squadObservations.officialId, row.officialId));
      }
    }
    const departed: DepartedPlayer[] = allRows
      .filter((r) => !activeIds.has(r.officialId))
      .map((r) => ({ officialId: r.officialId, name: r.firstName, photo: r.photoUrl, lastSeenAt: r.lastSeenAt.toISOString() }));
    return {
      map: new Map(rows.map((r) => [r.officialId, { newUntil: r.newUntil, photoUpdatedAt: r.photoUpdatedAt }])),
      departed,
    };
  });
}

/** Asıl kadro servisi — manual yenileme ve 00:00 döngüsü bunu kullanır. */
export async function getLiveSquad(): Promise<EnrichedSquad> {
  return cached("squad:official-merged", 10 * 60_000, async () => {
    const [officialResult, espnResult, market] = await Promise.all([
      getOfficialSquad(),
      getEspnSquad().catch(() => null),
      getMarketInfo().catch(() => null),
    ]);
    const official = officialResult.players;
    const now = new Date();
    let tracking = new Map<string, { newUntil: Date | null; photoUpdatedAt: Date | null }>();
    let departed: DepartedPlayer[] = [];
    let tracked = true;
    try {
      // Eski görüntüyle yeni transfer/ayrılış kararı verilmez
      if (!officialResult.stale) {
        const res = await trackSquad(official, now);
        tracking = res.map;
        departed = res.departed;
      } else tracked = false;
    } catch (error) {
      console.error("[kadro] Kalıcı gözlem kaydı yazılamadı", error);
      tracked = false;
    }

    const espnPlayers = (espnResult?.players ?? []) as Player[];
    const used = new Set<string>();
    const players = official.map((o) => {
      const key = nameKey(o.name);
      let candidate = espnPlayers.find((p) => !used.has(p.id) && nameKey(p.name) === key);
      if (!candidate) {
        candidate = espnPlayers.find(
          (p) => !used.has(p.id) && p.jersey === o.jersey && compatibleNames(o.name, p.name),
        );
      }
      if (candidate) used.add(candidate.id);
      const track = tracking.get(o.officialId);
      const newUntil = track?.newUntil ?? null;
      // Piyasa değeri eşleşmesi: aynı forma numarası + uyumlu ad (yanlış oyuncuya değer bağlanmaz)
      const mk = market?.find((m) => m.jersey === o.jersey && compatibleNames(o.name, m.name));
      return officialToPlayer(o, candidate, Boolean(newUntil && newUntil > now), track?.photoUpdatedAt?.toISOString() ?? null, mk);
    });

    return {
      season: espnResult?.season ?? "2026-27",
      coach: espnResult?.coach ?? null,
      players,
      departed,
      source: "Trabzonspor Kulübü + ESPN",
      checkedAt: officialResult.stale ? officialResult.fetchedAt : now.toISOString(),
      newCount: players.filter((p) => p.isNew).length,
      tracked,
      marketOk: Boolean(market),
      stale: officialResult.stale || isStale("official:squad") || isStale("espn:squad") || isStale("market:"),
    } satisfies EnrichedSquad;
  });
}
