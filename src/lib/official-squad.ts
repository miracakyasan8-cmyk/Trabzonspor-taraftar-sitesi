import { eq } from "drizzle-orm";
import { db } from "@/db";
import { squadSnapshots } from "@/db/schema";
import { cached } from "./cache";
import { fetchText } from "./http";
import type { Position } from "./types";

/**
 * Trabzonspor Kulübü'nün RESMÎ A Takım kadrosu.
 *
 * Kulüp sitesi Cloudflare koruması altında olduğundan sayfa, okunabilir HTML/markdown
 * proxy'si üzerinden sunucuda okunur; tüm oyuncu kimlikleri, forma numaraları ve
 * yüksek çözünürlüklü profil fotoğrafları doğrudan resmî kaynaktan gelir.
 * Hiçbir oyuncu/fotoğraf uydurulmaz; kaynak okunamazsa hata fırlatılır.
 */

import { OFFICIAL_SQUAD_URL } from "./constants";
export { OFFICIAL_SQUAD_URL };
/** Türkçe sayfa engellenirse İngilizce kadro sekmesi ikinci kaynak olarak denenir */
const OFFICIAL_SQUAD_URL_EN =
  "https://www.trabzonspor.org.tr/en/branches/futbol/a-takimi-5?tab=oyuncu";
const reader = (url: string) => `https://r.jina.ai/${url}`;
const SNAPSHOT_ID = "official-squad";

export interface OfficialPlayer {
  officialId: string;
  name: string;
  jersey: number;
  position: Position;
  positionTr: string;
  photo: string;
  profileUrl: string;
  birthDate: string | null;
}

const POS: Record<string, Position> = {
  Kaleci: "G",
  Defans: "D",
  "Orta Saha": "M",
  Forvet: "F",
};

export function parseOfficialSquad(markdown: string): OfficialPlayer[] {
  // Kart ikonundan bağımsız, esnek kalıp: "<Mevki> <No> <Ad> <gg.aa.yyyy> … ![Image N: Ad](foto.png)](profil)"
  const pattern =
    /(Kaleci|Defans|Orta Saha|Forvet)\s+(\d{1,2})\s+([^\d\[\]!]+?)\s+(\d{2}\.\d{2}\.\d{4})\s*(?:!\[[^\]]*\]\([^)]*\)\s*)*?!\[Image \d+: ([^\]]+)\]\((https:\/\/cdn\.trabzonspor\.org\.tr\/[^)\s]+\.(?:png|jpe?g|webp))\)\s*\]\((https:\/\/www\.trabzonspor\.org\.tr\/[^)\s]+)\)/g;

  const map = new Map<string, OfficialPlayer>();
  for (const match of markdown.matchAll(pattern)) {
    const [, positionTr, no, rawName, birth, alt, photo, profileUrl] = match;
    const name = (alt || rawName).replace(/\s+/g, " ").trim();
    const slug = profileUrl.split("/").filter(Boolean).pop();
    if (!slug || !POS[positionTr] || !photo || /\/(turkey|[a-z-]+)\.png$/.test(photo) && !/trabzonspor_/.test(photo)) continue;
    map.set(slug, {
      officialId: slug,
      name,
      jersey: Number(no),
      position: POS[positionTr],
      positionTr,
      photo,
      profileUrl,
      birthDate: birth ?? null,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.jersey - b.jersey);
}

async function readOfficial(url: string): Promise<OfficialPlayer[]> {
  const markdown = await fetchText(reader(url), {
    timeoutMs: 25_000,
    retries: 3,
    headers: { Accept: "text/plain", "X-Timeout": "20" },
  });
  const players = parseOfficialSquad(markdown);
  if (players.length < 15) throw new Error("Resmî kulüp kadrosu eksik okundu; güvenilmeyen veri gösterilmedi");
  return players;
}

export interface OfficialSquadResult {
  players: OfficialPlayer[];
  /** true: canlı kaynak yanıt vermedi, kalıcı son başarılı görüntü sunuluyor */
  stale: boolean;
  fetchedAt: string;
  error: string | null;
}

/**
 * Kurtarma sırası: TR sayfa (3 deneme) → EN sayfa (3 deneme) → bellek/DB'deki son başarılı görüntü.
 * Her başarılı okuma DB'ye yazılır; böylece sunucu yeniden başlasa bile kurtarma mümkündür.
 */
export async function getOfficialSquad(): Promise<OfficialSquadResult> {
  return cached("official:squad", 15 * 60_000, async () => {
    let lastError: string | null = null;
    for (const url of [OFFICIAL_SQUAD_URL, OFFICIAL_SQUAD_URL_EN]) {
      try {
        const players = await readOfficial(url);
        const fetchedAt = new Date();
        db.insert(squadSnapshots)
          .values({ id: SNAPSHOT_ID, payload: players, fetchedAt })
          .onConflictDoUpdate({ target: squadSnapshots.id, set: { payload: players, fetchedAt } })
          .catch((e: unknown) => console.error("[kadro] anlık görüntü yazılamadı", e));
        return { players, stale: false, fetchedAt: fetchedAt.toISOString(), error: null };
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Kaynak yanıt vermedi";
        console.warn(`[kadro] ${url} okunamadı: ${lastError}`);
      }
    }
    // Kalıcı kurtarma: son başarılı görüntü
    const [row] = await db.select().from(squadSnapshots).where(eq(squadSnapshots.id, SNAPSHOT_ID)).limit(1);
    if (row) {
      console.warn("[kadro] canlı kaynak yok; DB'deki son başarılı kadro sunuluyor");
      return { players: row.payload as OfficialPlayer[], stale: true, fetchedAt: row.fetchedAt.toISOString(), error: lastError };
    }
    throw new Error(lastError ?? "Resmî kadro alınamadı");
  }, { staleMaxAgeMs: 30 * 24 * 3600_000 });
}
