import { load } from "cheerio";
import { fetchText } from "./http";
import { STORE_URL, type StoreCategory, type StoreProduct, type StoreSource } from "./store-types";

/** Resmî TS Club vitrini: halka açık, sunucuda oluşturulmuş ürün kartları. Gizli/özel API kullanılmaz. */
const MAX_PAGES = 16;
const MAX_PARALLEL = 4;

interface CategorySpec {
  category: StoreCategory;
  title: string;
  url: string;
}

function officialUrl(value: string) {
  try {
    const url = new URL(value, STORE_URL);
    if (!["trabzonspor.com.tr", "www.trabzonspor.com.tr"].includes(url.hostname)) return null;
    url.protocol = "https:";
    return url;
  } catch {
    return null;
  }
}

function catalogUrl(value: string, page = 1) {
  const url = officialUrl(value);
  if (!url) throw new Error("Resmî olmayan mağaza adresi reddedildi");
  // Mağazanın kendi para birimi seçicisinin kullandığı, doğrulanmış parametre.
  url.searchParams.set("currency", "try");
  if (page > 1) url.searchParams.set("sayfa", String(page));
  return url.toString();
}

async function readPage(url: string) {
  return fetchText(url, {
    timeoutMs: 12_000,
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "tr-TR,tr;q=0.9",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });
}

/** Yalnızca kaynağın açıkça TRY/₺/TL olarak gösterdiği fiyatlar kabul edilir. Kur dönüşümü yapılmaz. */
export function parseLira(text: string): number | null {
  if (!/(?:₺|\bTL\b|\bTRY\b)/i.test(text) || /[$€£]/.test(text)) return null;
  const clean = text.replace(/(?:TRY|TL)/gi, "").replace(/[^\d.,]/g, "");
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function parseCatalogPage(html: string, category: StoreCategory) {
  const $ = load(html);
  // Handlebars şablonlarını gerçek ürün sanmamak için betikler tamamen çıkarılır.
  $("script, style, template").remove();
  const area = $("#ProductPageProductList").length ? $("#ProductPageProductList") : $("body");
  const products: StoreProduct[] = [];
  let rejected = 0;

  area.find(".productItem").each((_, element) => {
    const item = $(element);
    const nameLink = item.find(".productName a").first();
    const detailLink = item.find(".productImage a.detailLink").first();
    const name = nameLink.text().replace(/\s+/g, " ").trim();
    const url = officialUrl(nameLink.attr("href") ?? detailLink.attr("href") ?? "");
    const id = item.find(".productDetail[data-id]").attr("data-id") ?? detailLink.attr("data-id");
    const imageNode = item.find(".productImage img").first();
    const rawImage = imageNode.attr("data-original") ?? imageNode.attr("data-src") ?? imageNode.attr("src");
    const price = parseLira(item.find(".discountPriceSpan").first().text());
    const previousPrice = parseLira(item.find(".regularPriceSpan").first().text());
    let image: URL | null = null;
    try {
      if (rawImage) image = new URL(rawImage, STORE_URL);
    } catch { /* bozuk görsel adresi karttan çıkarılır */ }

    const imageIsOfficial = image?.protocol === "https:" &&
      /(^|\.)(ticimax\.(cloud|com)|trabzonspor\.com\.tr|trabzonspor\.org\.tr)$/.test(image.hostname);
    if (!id || !name || !url || !imageIsOfficial || price == null || !image) {
      if (name) rejected += 1;
      return;
    }
    const sourceNew = item.find(".newIcon").length > 0;
    products.push({
      id,
      name,
      url: catalogUrl(url.toString()),
      image: image.toString(),
      price,
      previousPrice: previousPrice != null && previousPrice > price ? previousPrice : null,
      currency: "TRY",
      category,
      sourceNew,
      isNew: sourceNew,
      newUntil: null,
      available: item.find(".outOfStock, .outOfStockIcon, .tukendi").length === 0,
    });
  });

  const total = Number($(".totalItems").first().text().replace(/\D/g, "")) || products.length;
  const perPage = Number($(".currentItems").first().text().replace(/\D/g, "")) || products.length || 24;
  return { products, rejected, pages: Math.max(1, Math.ceil(total / perPage)), total };
}

async function pool<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      try { results[index] = { status: "fulfilled", value: await fn(items[index]) }; }
      catch (reason) { results[index] = { status: "rejected", reason }; }
    }
  }));
  return results;
}

/** Sezon ve koleksiyon adresleri mağazanın canlı menüsünden keşfedilir; yıl sabitlenmez. */
export async function fetchOfficialCatalog() {
  const indexHtml = await readPage(catalogUrl("/forma"));
  const $ = load(indexHtml);
  $("script, style, template").remove();
  const seasons = new Map<string, { title: string; score: number }>();
  const collections = new Map<string, { title: string; score: number }>();
  $("a[href]").each((_, node) => {
    const a = $(node);
    const href = a.attr("href") ?? "";
    const url = officialUrl(href);
    if (!url) return;
    const text = a.text().replace(/\s+/g, " ").trim();
    const season = url.pathname.match(/\/(20\d{2})[-/]?(20\d{2})-sezonu-formalar/);
    if (season) seasons.set(url.pathname, { title: text, score: Number(season[1]) });
    const collection = url.pathname.match(/\/(20\d{2})-(kis|yaz)-koleksiyonu/);
    if (collection) collections.set(url.pathname, { title: text, score: Number(collection[1]) * 2 + (collection[2] === "kis" ? 1 : 0) });
  });
  const season = [...seasons.entries()].sort((a, b) => b[1].score - a[1].score)[0];
  const collection = [...collections.entries()].sort((a, b) => b[1].score - a[1].score)[0];
  const specs: CategorySpec[] = [
    { category: "forma", title: season?.[1].title ?? "Formalar", url: catalogUrl(season?.[0] ?? "/forma") },
    { category: "antrenman", title: "Antrenman Ürünleri", url: catalogUrl("/antrenman-urunleri") },
    ...(collection ? [{ category: "koleksiyon" as const, title: collection[1].title, url: catalogUrl(collection[0]) }] : []),
    { category: "aksesuar", title: "Aksesuarlar", url: catalogUrl("/aksesuar") },
  ];

  const all: StoreProduct[] = [];
  const sources: StoreSource[] = [];
  const warnings: string[] = [];
  const firstPages = await pool(specs, async (spec) => ({ spec, parsed: parseCatalogPage(await readPage(spec.url), spec.category) }));
  const pageJobs: { spec: CategorySpec; page: number }[] = [];

  for (let i = 0; i < firstPages.length; i += 1) {
    const result = firstPages[i];
    if (result.status === "rejected") {
      warnings.push(`${specs[i].title} şu anda mağazadan alınamadı.`);
      continue;
    }
    const { spec, parsed } = result.value;
    if (!parsed.products.length) {
      warnings.push(`${spec.title} için doğrulanmış Türk lirası fiyatlı ürün okunamadı.`);
      continue;
    }
    all.push(...parsed.products);
    const limit = Math.min(MAX_PAGES, parsed.pages);
    sources.push({ category: spec.category, title: spec.title, url: spec.url, count: 0, pagesFetched: 1, complete: parsed.pages <= MAX_PAGES && !parsed.rejected });
    for (let page = 2; page <= limit; page += 1) pageJobs.push({ spec, page });
    if (parsed.rejected) warnings.push(`${spec.title}: görseli veya TRY fiyatı doğrulanamayan ${parsed.rejected} ürün gösterilmedi.`);
    if (parsed.pages > MAX_PAGES) warnings.push(`${spec.title} için mağazanın ilk ${MAX_PAGES} sayfası tarandı.`);
  }

  const remaining = await pool(pageJobs, async ({ spec, page }) => ({
    spec,
    parsed: parseCatalogPage(await readPage(catalogUrl(spec.url, page)), spec.category),
  }));
  remaining.forEach((result, index) => {
    const source = sources.find((s) => s.category === pageJobs[index].spec.category);
    if (result.status === "rejected" || !result.value.parsed.products.length) {
      if (source) source.complete = false;
      return;
    }
    all.push(...result.value.parsed.products);
    if (source) { source.pagesFetched += 1; if (result.value.parsed.rejected) source.complete = false; }
  });

  const unique = [...new Map(all.map((product) => [`${product.category}:${product.id}`, product])).values()];
  const ids = new Set<string>();
  const products = unique.filter((product) => {
    if (ids.has(product.id)) return false;
    ids.add(product.id);
    return true;
  });
  for (const source of sources) {
    source.count = products.filter((p) => p.category === source.category).length;
    if (!source.complete) warnings.push(`${source.title} taraması kısmi olabilir; tüm ürünler için resmî mağazayı inceleyin.`);
  }
  if (!products.length) throw new Error("Resmî TS Club kataloğundan doğrulanmış ürün alınamadı. Fiyat veya görsel uydurulmadı.");
  return { products, sources, warnings, season: season?.[1].title ?? null, collection: collection?.[1].title ?? null };
}
