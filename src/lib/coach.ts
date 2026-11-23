import { fetchJson } from "./http";
import type { Coach } from "./types";

/**
 * Teknik direktör bilgisi Wikipedia (İngilizce) Trabzonspor bilgi kutusundan canlı okunur.
 * (Türkçe sayfa güncel olmayabildiği için İngilizce sayfa tercih edilir; haberlerle çapraz doğrulanmıştır.)
 */
export async function getCoach(): Promise<Coach | null> {
  const d = await fetchJson<{ parse?: { wikitext?: string } }>(
    "https://en.wikipedia.org/w/api.php?action=parse&page=Trabzonspor&prop=wikitext&section=0&format=json&formatversion=2",
    { timeoutMs: 10_000 },
  );
  const wikitext = d.parse?.wikitext ?? "";
  const m = wikitext.match(/\|\s*(?:manager|head coach)\s*=\s*(.+)/i);
  if (!m) return null;

  const name = m[1]
    .replace(/\{\{[^}]*\}\}/g, "") // bayrak şablonları
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1") // [[Link|Ad]] → Ad
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return null;

  return {
    name,
    source: "Wikipedia",
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`,
  };
}
