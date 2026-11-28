import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { storeProductObservations, storeSyncState } from "@/db/schema";
import { cached } from "./cache";
import { fetchOfficialCatalog } from "./store-source";
import { STORE_URL, type StoreData, type StoreProduct } from "./store-types";

const NEW_FOR_MS = 14 * 24 * 60 * 60_000;

/** Ürün gözlemleri süreç yeniden başlasa bile korunur; fiyat/görsel veritabanına yazılmaz. */
async function trackNewProducts(products: StoreProduct[], now: Date) {
  return db.transaction(async (tx) => {
    // Manuel yenileme ve cron aynı anda çalıştığında başlangıç envanteri iki kez kurulmasın.
    await tx.execute(sql`select pg_advisory_xact_lock(61006724)`);
    const [initialized, existing] = await Promise.all([
      tx.select().from(storeSyncState).where(eq(storeSyncState.id, "official-ts-club")).limit(1),
      tx.select().from(storeProductObservations),
    ]);
    const known = new Set(existing.map((r) => r.productId));
    const newUntil = initialized.length ? new Date(now.getTime() + NEW_FOR_MS) : null;
    const rows = await tx.insert(storeProductObservations).values(products.map((p) => ({
      productId: p.id,
      firstSeenAt: now,
      lastSeenAt: now,
      newUntil: !known.has(p.id) ? newUntil : null,
    }))).onConflictDoUpdate({
      target: storeProductObservations.productId,
      set: { lastSeenAt: now },
    }).returning();
    await tx.insert(storeSyncState).values({
      id: "official-ts-club", initializedAt: now, lastCheckedAt: now,
    }).onConflictDoUpdate({ target: storeSyncState.id, set: { lastCheckedAt: now } });
    return new Map(rows.map((row) => [row.productId, row.newUntil]));
  });
}

/**
 * Ortak yenileme ve 00:00 döngüsünün kullandığı tek katalog servisi.
 * Beş dakika TTL; manuel/cron yenilemesi clearCache ile zorunlu taze okuma yapar.
 * Önbellek süresi dolduğunda kaynak başarısızsa eski fiyatları gizleyerek hata verir.
 */
export async function getStoreCatalog(): Promise<StoreData> {
  return cached("store:official-catalog", 5 * 60_000, async () => {
    const catalog = await fetchOfficialCatalog();
    const now = new Date();
    let tracking = new Map<string, Date | null>();
    let newTracking = true;
    try {
      tracking = await trackNewProducts(catalog.products, now);
    } catch (error) {
      console.error("[TS Store] Ürün gözlem kaydı yazılamadı:", error);
      catalog.warnings.push("Kalıcı yeni-ürün takibi şu anda kullanılamıyor; yalnızca mağazanın kendi yeni-ürün etiketleri gösteriliyor.");
      newTracking = false;
    }
    const products = catalog.products.map((p) => {
      const newUntil = tracking.get(p.id) ?? null;
      return { ...p, isNew: p.sourceNew || Boolean(newUntil && newUntil > now), newUntil: newUntil?.toISOString() ?? null };
    });
    return {
      ...catalog,
      products,
      checkedAt: now.toISOString(),
      source: "TS Club • Resmî mağaza",
      sourceUrl: STORE_URL,
      newCount: products.filter((p) => p.isNew).length,
      newTracking,
    } satisfies StoreData;
  }, { staleMaxAgeMs: 24 * 3600_000 });
}
