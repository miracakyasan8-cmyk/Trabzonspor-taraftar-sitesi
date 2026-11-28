import { cached } from "./cache";
import { fetchJson } from "./http";

/**
 * Wikidata üzerinden oyuncu çözümleme:
 * - Transfermarkt oyuncu kimliği (P2446) → gerçek profil URL'si
 * - Fotoğraf (P18 Commons dosyası)
 * Arama, aksan/varyant farklarına dayanıklıdır (örn. "Arsenii Batahov" → Arserniy Batagov).
 */

const WB = "https://www.wikidata.org/w/api.php";

interface WbSearch {
  search?: { id: string; label: string; description?: string }[];
}
interface WbEntity {
  entities?: Record<string, { claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]> }>;
}

const slugify = (s: string) =>
  s
    .toLocaleLowerCase("en-US")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function searchEntity(name: string): Promise<{ id: string; label: string } | null> {
  const d = await fetchJson<WbSearch>(
    `${WB}?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&limit=5&format=json`,
    { timeoutMs: 10_000 },
  );
  const hits = d.search ?? [];
  // Önce futbolcu açıklamalı sonuç, yoksa ilk sonuç
  const fb = hits.find((h) => /football/i.test(h.description ?? ""));
  const best = fb ?? hits[0];
  return best ? { id: best.id, label: best.label } : null;
}

interface WikiSearch {
  query?: { search?: { title: string }[] };
}

/** ESPN'in ASCII'ye çevirdiği adlar için Wikipedia başlık düzeltmesi (örn. "Arsenii Batahov" → "Arseniy Batahov"). */
async function wikiTitle(name: string): Promise<string | null> {
  const d = await fetchJson<WikiSearch>(
    `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&list=search&srsearch=${encodeURIComponent(name)}&srlimit=3`,
    { timeoutMs: 10_000 },
  );
  return d.query?.search?.[0]?.title ?? null;
}

export interface WikiPlayer {
  tmUrl: string | null;
  photo: string | null;
  label: string | null;
}

export async function getWikiPlayer(name: string): Promise<WikiPlayer> {
  return cached(`wiki:player:${slugify(name)}`, 7 * 24 * 3600_000, async () => {
    const empty: WikiPlayer = { tmUrl: null, photo: null, label: null };
    let hit: { id: string; label: string } | null = null;
    try {
      hit = await searchEntity(name);
      if (!hit) {
        // Yazım varyantı olabilir — Wikipedia aramasıyla doğru başlığı bulup tekrar dene
        const title = await wikiTitle(name).catch(() => null);
        if (title) hit = await searchEntity(title).catch(() => null);
      }
    } catch {
      return empty;
    }
    if (!hit) return empty;
    const qid = hit.id;

    try {
      const d = await fetchJson<WbEntity>(
        `${WB}?action=wbgetentities&ids=${qid}&props=claims|labels&languages=en&format=json`,
        { timeoutMs: 10_000 },
      );
      const ent = d.entities?.[qid];
      if (!ent?.claims) return { ...empty, label: hit.label };

      const str = (pid: string): string | null => {
        const v = ent.claims?.[pid]?.[0]?.mainsnak?.datavalue?.value;
        return typeof v === "string" && v ? v : null;
      };

      const tmId = str("P2446");
      const file = ent.claims?.P18?.[0]?.mainsnak?.datavalue?.value as
        | { text?: string }
        | string
        | undefined;
      const fileName = typeof file === "string" ? file : (file?.text ?? null);
      const slug = slugify(hit.label || name);

      return {
        tmUrl: tmId ? `https://www.transfermarkt.com/${slug}/profil/spieler/${tmId}` : null,
        photo: fileName
          ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=600`
          : null,
        label: hit.label,
      };
    } catch {
      return { ...empty, label: hit.label };
    }
  });
}

/** Transfermarkt kimliği bulunamazsa gerçek arama sayfası (kullanıcı tek tıkla profile ulaşır). */
export function tmSearchUrl(name: string) {
  return `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(name)}`;
}
