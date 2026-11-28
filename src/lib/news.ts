import { createHash } from "node:crypto";
import { cached } from "./cache";
import { fetchFeed, googleNewsUrl, type FeedItem } from "./rss";
import { NEWS_SINCE_ISO } from "./constants";
import type { NewsData, NewsItem } from "./types";

/**
 * Haber akışı — yalnızca güvenilir, doğrulanabilir ve doğrudan Trabzonspor odaklı.
 *
 * Katmanlar:
 * 1) Yıl bazlı pencereler: 2026'dan içinde bulunulan yıla kadar (2027, 2028… otomatik eklenir)
 *    × (genel + transfer sorgusu). Ay bazlı filtreleme kullanılmaz.
 * 2) Genişletilmiş kaynak havuzu — site: sorguları (büyük spor mecraları + Trabzon yerelleri).
 * 3) Katı filtreler:
 *    - başlıkta "trabzonspor" geçmeli (alakasız içerik kesinlikle elenir)
 *    - tıklama tuzağı kalıpları (tıkla, şok, inanılmaz vb.) başlıkta geçerse elenir
 *    - 1 Ocak 2026 öncesi kesinlikle gösterilmez
 *    - aynı haber başlığı (kaynak bağımsız) tek kart olur — mükerrer yok
 * 4) Kaynak adı + site favicon'u her kartta; orijinal haber linki korunur.
 *
 * Hiçbir veri uydurulmaz; kaynak başarısız olursa bölüm hata verir, boş/statik içerik gösterilmez.
 */

const SINCE = new Date(NEWS_SINCE_ISO);
const FIRST_YEAR = 2026; // arşiv başlangıcı: 1 Ocak 2026

const QUERIES = [
  { q: "Trabzonspor", category: "genel" as const },
  { q: "Trabzonspor transfer", category: "transfer" as const },
];

/** Güvenilir kaynak havuzu — site: sorgularıyla taranır. */
const SOURCE_SITES = [
  { q: "site:hurriyet.com.tr", source: "Hürriyet" },
  { q: "site:sozcu.com.tr", source: "Sözcü" },
  { q: "site:milliyet.com.tr", source: "Milliyet" },
  { q: "site:aa.com.tr", source: "Anadolu Ajansı" },
  { q: "site:ntv.com.tr", source: "NTV" },
  { q: "site:trthaber.com", source: "TRT Haber" },
  { q: "site:fanatik.com.tr", source: "Fanatik" },
  { q: "site:sporx.com", source: "Sporx" },
  { q: "site:fotomac.com.tr", source: "Fotomaç" },
  { q: "site:ajansspor.com", source: "Ajansspor" },
  { q: "site:mackolik.com", source: "Maçkolik" },
  { q: "site:trabzonhaber24.com", source: "Trabzonhaber24" },
  { q: "site:trabzon.org", source: "trabzon.org" },
  { q: "site:haber61.net", source: "Haber61" },
  { q: "site:61saat.com", source: "61Saat" },
  { q: "site:trabzonspor.org.tr", source: "Trabzonspor Kulübü Resmi Web Sitesi" },
  { q: "site:kap.org.tr", source: "KAP (Kamuyu Aydınlatma Platformu)" },
] as const;

const PER_YEAR_LIMIT = 600;
const PER_SITE_YEAR_LIMIT = 100;

/** Tıklama tuzağı / aldatıcı başlık kalıpları — bu kelimeler başlıkta geçerse haber elenir. */
const CLICKBAIT = [
  "tıkla",
  "tıklayın",
  "tıklamanız",
  "şok",
  "şoke",
  "inanılmaz",
  "göreceksiniz",
  "ortaya çıktı",
  "pes demez",
  "bu kadarını beklemiyorduk",
  "hemen bakın",
];

const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** 2026'dan bugüne kadar tüm yıllar (dinamik: yeni yılda otomatik uzar). */
export function newsYears(now = new Date()): number[] {
  const y = Math.max(FIRST_YEAR, now.getUTCFullYear());
  const out: number[] = [];
  for (let year = FIRST_YEAR; year <= y; year += 1) out.push(year);
  return out;
}

async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>) {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        try {
          out[idx] = { status: "fulfilled", value: await fn(items[idx]) };
        } catch (reason) {
          out[idx] = { status: "rejected", reason };
        }
      }
    }),
  );
  return out;
}

const norm = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]+/gu, "");

function domainOf(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isRelevant(title: string): boolean {
  const t = title.toLocaleLowerCase("tr-TR");
  if (!t.includes("trabzonspor")) return false;
  if (CLICKBAIT.some((w) => t.includes(w))) return false;
  return true;
}

export async function getNews(): Promise<NewsData> {
  return cached("news:years", 10 * 60_000, async () => {
    const now = Date.now();
    const nowYear = new Date(now).getUTCFullYear();
    const years = newsYears();
    const horizon = ymd(now + 2 * 86_400_000);

    // Yıl pencereleri: her yıl için [yıl-01-01, sonraki yıl-01-01) — içinde bulunulan yıl bugüne kadar
    const windows = years.map((y) => ({
      year: y,
      after: `${y}-01-01`,
      before: y < nowYear ? `${y + 1}-01-01` : horizon,
    }));

    const baseJobs = QUERIES.flatMap((qd) => windows.map((w) => ({ qd, w })));
    const siteJobs = SOURCE_SITES.flatMap((s) =>
      windows.map((w) => ([
        { site: s, q: `${s.q} Trabzonspor`, category: "genel" as const, w },
        { site: s, q: `${s.q} Trabzonspor transfer`, category: "transfer" as const, w },
      ])),
    ).flat();

    const jobs = [
      ...baseJobs.map((j) => ({ ...j, kind: "base" as const })),
      ...siteJobs.map((j) => ({ ...j, kind: "site" as const })),
    ];

    const results = await pool(jobs, 6, async (job) => {
      const { w } = job;
      if (job.kind === "base") {
        const url = googleNewsUrl(`${job.qd.q} after:${w.after} before:${w.before}`);
        const { items, provider } = await fetchFeed(url);
        return {
          items: items.slice(0, PER_YEAR_LIMIT),
          provider,
          category: job.qd.category,
          kind: "base" as const,
          siteSource: null as string | null,
          siteDomain: null as string | null,
        };
      }
      const url = googleNewsUrl(`${job.q} after:${w.after} before:${w.before}`);
      const { items, provider } = await fetchFeed(url);
      return {
        items: items.slice(0, PER_SITE_YEAR_LIMIT),
        provider,
        category: job.category,
        kind: "site" as const,
        siteSource: job.site.source,
        siteDomain: job.site.q.split(":")[1],
      };
    });

    const providers = new Set<string>();
    const map = new Map<string, NewsItem>();
    let failed = 0;

    for (const r of results) {
      if (r.status === "rejected") {
        failed += 1;
        continue;
      }
      providers.add(r.value.provider);
      for (const it of r.value.items as FeedItem[]) {
        const t = +new Date(it.publishedAt);
        if (t < +SINCE || t > now + 3_600_000) continue; // 2026 öncesi kesinlikle yok
        const rawTitle = it.title.trim();
        if (!isRelevant(rawTitle)) continue; // alakasız + tıklama tuzağı ele
        const domain = domainOf(it.sourceUrl) ?? r.value.siteDomain;
        const sourceName = it.source ?? r.value.siteSource ?? "Google Haberler";
        const key = norm(rawTitle); // aynı haber başlığı kaynak bağımsız tek kez
        const existing = map.get(key);
        if (existing) {
          if (r.value.kind === "site" && r.value.category === "transfer") existing.category = "transfer";
          continue;
        }
        map.set(key, {
          id: createHash("sha1").update(it.link).digest("hex").slice(0, 12),
          title: rawTitle,
          link: it.link,
          source: sourceName,
          sourceDomain: domain,
          publishedAt: it.publishedAt,
          category: r.value.category,
        });
      }
    }

    if (map.size === 0) throw new Error("Haber kaynaklarından 2026+ Trabzonspor haberi alınamadı");

    // Yıl başına sınır: her yıl en yeni PER_YEAR_LIMIT haber tutulur
    const perYear = new Map<number, number>();
    const items = Array.from(map.values())
      .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
      .filter((it) => {
        const year = new Date(it.publishedAt).getUTCFullYear();
        const n = perYear.get(year) ?? 0;
        perYear.set(year, n + 1);
        return n < PER_YEAR_LIMIT;
      });

    return {
      items,
      provider: Array.from(providers).join(" + "),
      since: NEWS_SINCE_ISO,
      total: items.length,
      failedWindows: failed,
      years,
    } satisfies NewsData;
  });
}
