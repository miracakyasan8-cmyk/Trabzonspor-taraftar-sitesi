import { clearCache, staleReport } from "./cache";
import { getFixtures, getLineup, getLiveFixture, getStandings, getTournamentStandings } from "./espn";
import { getLiveSquad } from "./squad";
import { getNews } from "./news";
import { getSocial } from "./social";
import { getStoreCatalog } from "./store";
import { resolveBroadcasts } from "./tv";
import type { FixturesData, PortalData, SectionKey, SyncSource } from "./types";
import { CUP_SLUG } from "./cup";
import { provisionalFinished } from "./finished";

const state = globalThis as unknown as { __portalUpdatedAt?: string; __portalSources?: SyncSource[] };

/** Son senkronizasyonun kaynak raporu (yenileme veya 00:00 döngüsü) */
export function getLastSources(): SyncSource[] {
  return state.__portalSources ?? [];
}

export function getLastUpdated(): string | null {
  return state.__portalUpdatedAt ?? null;
}

export function recordUpdatedAt(iso: string) {
  if (!state.__portalUpdatedAt || iso > state.__portalUpdatedAt) state.__portalUpdatedAt = iso;
}

export async function loadFixtures(): Promise<FixturesData> {
  const base = await getFixtures();
  const live = (await getLiveFixture().catch(() => null)) ?? base.live;
  const next = base.next.filter((f) => f.id !== live?.id);
  const resolved = await resolveBroadcasts(live ? [live, ...next] : next);
  if (!state.__portalUpdatedAt) recordUpdatedAt(new Date().toISOString());
  // ESPN takvimi henüz güncellenmediyse, az önce biten maç geçici olarak arşive eklenir
  const known = new Set(base.recent.map((f) => f.id));
  const provisional = provisionalFinished(known).filter((f) => !known.has(f.id));
  const recent = [...provisional, ...base.recent]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 14);
  return {
    live: live ? resolved[0] : null,
    next: live ? resolved.slice(1) : resolved,
    recent,
  };
}

/** Manuel yenileme ve 00:00 görevi aynı altı kaynaklı senkronizasyonu kullanır. */
export async function getPortalData(force = false): Promise<PortalData> {
  const t0 = Date.now();
  if (force) clearCache();
  const fixturesP = loadFixtures();
  const lineupP = fixturesP.then((f) => getLineup(f.live ?? f.recent[0]));
  const [fx, st, sq, nw, so, ln, shop, tn] = await Promise.allSettled([
    fixturesP,
    getStandings(),
    getLiveSquad(),
    getNews(),
    getSocial(),
    lineupP,
    getStoreCatalog(),
    getTournamentStandings(),
  ]);

  const errors: Partial<Record<SectionKey, string>> = {};
  const pick = <T>(key: SectionKey, r: PromiseSettledResult<T>): T | null => {
    if (r.status === "fulfilled") return r.value;
    errors[key] = r.reason instanceof Error ? r.reason.message : "Kaynak yanıt vermedi";
    return null;
  };
  const fixtures = pick("fixtures", fx);
  const standings = pick("standings", st);
  const squad = pick("squad", sq);
  const news = pick("news", nw);
  const social = pick("social", so);
  const lineup = pick("lineup", ln);
  const store = pick("store", shop);
  const tournaments = tn.status === "fulfilled" ? tn.value : null;
  const err = (k: SectionKey) => errors[k] ?? "Kaynak yanıt vermedi";
  const allFixtures = fixtures ? [...(fixtures.live ? [fixtures.live] : []), ...fixtures.next, ...fixtures.recent] : [];
  const cupCount = allFixtures.filter((f) => f.leagueSlug === CUP_SLUG).length;

  const staleEntries = staleReport();
  const staleFor = (...prefixes: string[]) => {
    const hits = staleEntries.filter((e) => prefixes.some((p) => e.key.startsWith(p)));
    return hits.length ? { stale: true, staleSince: hits.map((h) => h.fetchedAt).sort()[0] } : { stale: false, staleSince: null };
  };
  const sources: SyncSource[] = [
    {
      key: "fixtures", label: "Maçlar & canlı skor", source: "ESPN resmî maç verisi",
      ok: Boolean(fixtures), ...staleFor("espn:fixtures", "espn:live"),
      detail: fixtures ? `${fixtures.recent.length} oynanmış • ${fixtures.next.length} oynanacak${fixtures.live ? " • CANLI maç var" : ""}` : err("fixtures"),
    },
    {
      key: "cup", label: "Ziraat Türkiye Kupası", source: "TheSportsDB takım akışı",
      ok: Boolean(fixtures), ...staleFor("tsdb:cup"), detail: cupCount ? `${cupCount} kupa maçı` : "Şu an kupa maçı yok",
    },
    {
      key: "standings", label: "Puan durumu & turnuvalar", source: "ESPN puan tabloları",
      ok: Boolean(standings && tournaments), ...staleFor("espn:standings", "espn:tournaments"),
      detail: tournaments ? tournaments.map((t) => t.competition).join(" • ") : err("standings"),
    },
    {
      key: "squad", label: "Kadro, fotoğraf, yaş & piyasa değeri", source: "trabzonspor.org.tr + trabzon.org",
      ok: Boolean(squad),
      ...(squad && "stale" in squad && squad.stale
        ? { stale: true, staleSince: "checkedAt" in squad ? (squad.checkedAt as string) : null }
        : staleFor("official:squad", "espn:squad", "market:", "squad:")),
      detail: squad
        ? `${squad.players.length} oyuncu • ${squad.players.filter((p) => "photo" in p && p.photo).length} resmî fotoğraf • ${squad.players.filter((p) => "marketValueEur" in p && p.marketValueEur).length} piyasa değeri`
        : err("squad"),
    },
    {
      key: "news", label: "Haberler & transfer", source: "Google Haberler canlı web araması",
      ok: Boolean(news), ...staleFor("news:"),
      detail: news ? `${news.total} haber • ${new Set(news.items.map((i) => i.source)).size} güvenilir kaynak` : err("news"),
    },
    {
      key: "store", label: "TS Store kataloğu", source: "trabzonspor.com.tr (resmî mağaza)",
      ok: Boolean(store), ...staleFor("store:"), detail: store ? `${store.products.length} ürün • ${store.newCount} yeni` : err("store"),
    },
    {
      key: "social", label: "Sosyal medya", source: "Resmî TikTok & Instagram",
      ok: Boolean(social), ...staleFor("social"), detail: social ? "Profil verisi + resmî gömme bileşenleri" : err("social"),
    },
  ];

  const data: PortalData = {
    updatedAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
    fixtures,
    standings,
    squad,
    news,
    social,
    lineup,
    store,
    tournaments,
    sources,
    staleCount: sources.filter((x) => x.stale).length,
    errors,
  };
  state.__portalSources = sources;
  if (data.fixtures || data.store) recordUpdatedAt(data.updatedAt);
  return data;
}

export async function getFixtureById(eventId: string) {
  const fx = await loadFixtures();
  return [...(fx.live ? [fx.live] : []), ...fx.next, ...fx.recent].find((f) => f.id === eventId) ?? null;
}
