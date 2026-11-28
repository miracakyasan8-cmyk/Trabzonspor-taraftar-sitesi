/**
 * Sunucu önbelleği — TTL + eşzamanlı istek birleştirme + "son başarılı veriyi koru" (stale fallback).
 *
 * Yenileme (manuel/00:00) `clearCache()` ile taze önbelleği boşaltır fakat son başarılı
 * değerler ayrı bir "stale" deposunda tutulur. Canlı kaynak 3 denemeden sonra da yanıt
 * vermezse boş/hatalı ekran yerine son başarılı veri, "eski veri" işaretiyle sunulur.
 */
interface Entry {
  value: unknown;
  expires: number;
  fetchedAt: number;
}

interface StaleEntry {
  value: unknown;
  fetchedAt: number;
  failedAt: number;
  error: string;
}

const g = globalThis as unknown as {
  __tsStore?: Map<string, Entry>;
  __tsStale?: Map<string, StaleEntry>;
  __tsInflight?: Map<string, Promise<unknown>>;
  __tsCacheEpoch?: number;
  __tsServedStale?: Map<string, StaleEntry>;
};
const store = (g.__tsStore ??= new Map<string, Entry>());
const stale = (g.__tsStale ??= new Map<string, StaleEntry>());
const inflight = (g.__tsInflight ??= new Map<string, Promise<unknown>>());
const servedStale = (g.__tsServedStale ??= new Map<string, StaleEntry>());
g.__tsCacheEpoch ??= 0;

/** Taze önbelleği temizler; son başarılı veriler kurtarma için korunur. */
export function clearCache() {
  g.__tsCacheEpoch = (g.__tsCacheEpoch ?? 0) + 1;
  for (const [key, entry] of store) {
    const prev = stale.get(key);
    stale.set(key, { value: entry.value, fetchedAt: entry.fetchedAt, failedAt: prev?.failedAt ?? 0, error: prev?.error ?? "" });
  }
  store.clear();
  inflight.clear();
  servedStale.clear();
}

/** Yalnızca belirli bir ön eke sahip taze kayıtları siler (son başarılı veriler korunur). */
export function invalidatePrefix(prefix: string) {
  for (const key of [...store.keys()]) if (key.startsWith(prefix)) store.delete(key);
  for (const key of [...inflight.keys()]) if (key.startsWith(prefix)) inflight.delete(key);
}

/** Son yenilemede "eski veri" ile sunulan anahtarlar (arayüz uyarısı için). */
export function staleReport(prefix?: string) {
  return Array.from(servedStale.entries())
    .filter(([k]) => !prefix || k.startsWith(prefix))
    .map(([key, s]) => ({ key, fetchedAt: new Date(s.fetchedAt).toISOString(), error: s.error }));
}

export function isStale(prefix: string) {
  for (const k of servedStale.keys()) if (k.startsWith(prefix)) return true;
  return false;
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  options: { allowStale?: boolean; staleMaxAgeMs?: number } = {},
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const running = inflight.get(key);
  if (running) return running as Promise<T>;
  const epoch = g.__tsCacheEpoch;

  const promise: Promise<T> = loader()
    .then((value) => {
      const now = Date.now();
      if (epoch === g.__tsCacheEpoch) {
        store.set(key, { value, expires: now + ttlMs, fetchedAt: now });
        stale.set(key, { value, fetchedAt: now, failedAt: 0, error: "" });
        servedStale.delete(key);
      }
      return value;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Kaynak yanıt vermedi";
      const fallback = hit ?? stale.get(key);
      const maxAge = options.staleMaxAgeMs ?? 7 * 24 * 3600_000;
      if (fallback && options.allowStale !== false && Date.now() - fallback.fetchedAt < maxAge) {
        const record = { value: fallback.value, fetchedAt: fallback.fetchedAt, failedAt: Date.now(), error: message };
        servedStale.set(key, record);
        stale.set(key, record);
        // Kısa süre sonra tekrar denensin diye taze depoya kısa TTL ile yaz
        store.set(key, { value: fallback.value, expires: Date.now() + Math.min(ttlMs, 60_000), fetchedAt: fallback.fetchedAt });
        console.warn(`[cache] ${key}: canlı kaynak başarısız (${message}); son başarılı veri sunuluyor`);
        return fallback.value as T;
      }
      throw error;
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}
