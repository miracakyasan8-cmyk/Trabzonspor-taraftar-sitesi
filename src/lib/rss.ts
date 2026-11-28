import { XMLParser } from "fast-xml-parser";
import { fetchJson, fetchText } from "./http";

export interface FeedItem {
  title: string;
  link: string;
  publishedAt: string;
  source: string | null;
  sourceUrl: string | null;
}

export type FeedProvider = "rss2json" | "google-rss";

interface RawItem {
  title?: string | number;
  link?: string;
  pubDate?: string;
  source?: string | { "#text"?: string; "@_url"?: string };
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });

/** "Başlık - Kaynak" kalıbından kaynak ekini ayıklar */
function splitTitle(raw: string, source: string | null) {
  const t = raw.trim();
  if (source && t.endsWith(` - ${source}`)) {
    return { title: t.slice(0, -(source.length + 3)).trim(), source };
  }
  const idx = t.lastIndexOf(" - ");
  if (idx > 15) return { title: t.slice(0, idx).trim(), source: source ?? t.slice(idx + 3).trim() };
  return { title: t, source };
}

async function viaDirect(url: string): Promise<FeedItem[]> {
  const xml = await fetchText(url, {
    timeoutMs: 12_000,
    headers: { Accept: "application/rss+xml, application/xml, text/xml" },
  });
  const doc = parser.parse(xml) as { rss?: { channel?: { item?: RawItem | RawItem[] } } };
  const raw = doc.rss?.channel?.item;
  const items = Array.isArray(raw) ? raw : raw ? [raw] : [];

  return items
    .filter((it) => it.title != null && it.link && it.pubDate)
    .map((it) => {
      const src =
        typeof it.source === "object" && it.source ? (it.source["#text"] ?? null) : (it.source ?? null);
      const srcUrl = typeof it.source === "object" && it.source ? (it.source["@_url"] ?? null) : null;
      const { title, source } = splitTitle(String(it.title), src ? String(src) : null);
      return {
        title,
        link: String(it.link),
        publishedAt: new Date(String(it.pubDate)).toISOString(),
        source,
        sourceUrl: srcUrl,
      };
    })
    .filter((it) => !Number.isNaN(+new Date(it.publishedAt)));
}

async function viaRss2Json(url: string): Promise<FeedItem[]> {
  const key = process.env.RSS2JSON_API_KEY;
  const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=100${
    key ? `&api_key=${key}` : ""
  }`;
  const d = await fetchJson<{
    status: string;
    message?: string;
    items?: { title: string; link: string; pubDate: string }[];
  }>(api, { timeoutMs: 12_000 });
  if (d.status !== "ok" || !d.items) throw new Error(d.message ?? "rss2json yanıt vermedi");

  return d.items.map((it) => {
    const { title, source } = splitTitle(it.title, null);
    return {
      title,
      link: it.link,
      // rss2json tarihleri UTC "YYYY-MM-DD HH:mm:ss" biçiminde verir
      publishedAt: new Date(`${it.pubDate.replace(" ", "T")}Z`).toISOString(),
      source,
      sourceUrl: null,
    };
  });
}

/**
 * Sunucu taraflı RSS proxy.
 * RSS2JSON_API_KEY tanımlıysa önce rss2json (anahtarlı, 100 öğe), aksi halde önce doğrudan Google RSS;
 * biri başarısız olursa diğerine düşer.
 */
export async function fetchFeed(url: string): Promise<{ items: FeedItem[]; provider: FeedProvider }> {
  const useApiFirst = Boolean(process.env.RSS2JSON_API_KEY);
  const order: [FeedProvider, (u: string) => Promise<FeedItem[]>][] = useApiFirst
    ? [
        ["rss2json", viaRss2Json],
        ["google-rss", viaDirect],
      ]
    : [
        ["google-rss", viaDirect],
        ["rss2json", viaRss2Json],
      ];

  let lastErr: unknown;
  for (const [provider, fn] of order) {
    try {
      const items = await fn(url);
      return { items, provider };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("RSS alınamadı");
}

export function googleNewsUrl(query: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=tr&gl=TR&ceid=TR:tr`;
}
