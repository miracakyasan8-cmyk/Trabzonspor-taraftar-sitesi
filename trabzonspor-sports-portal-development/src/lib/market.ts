import { cached } from "./cache";
import { fetchText } from "./http";

/**
 * Oyuncu detayları — piyasa değeri, doğum tarihi/yaş, boy, ayak, kulübe katılış ve sözleşme bitişi.
 * Kaynak: trabzon.org "Detaylı Kadro" sayfası (Transfermarkt verilerini yayımlar). Okunabilir
 * markdown proxy ile sunucuda okunur; eşleştirme forma numarası + ad benzerliğiyle yapılır.
 * Kaynak başarısızsa alanlar boş kalır — hiçbir değer uydurulmaz.
 */

const SOURCE_URL = "https://www.trabzon.org/takim/trabzonspor/kadro";
const READER = `https://r.jina.ai/${SOURCE_URL}`;
export const MARKET_SOURCE = { name: "trabzon.org (Transfermarkt verisi)", url: SOURCE_URL };

export interface MarketInfo {
  jersey: number;
  name: string;
  birthDate: string | null; // ISO yyyy-mm-dd
  age: number | null;
  nationality: string | null;
  height: string | null;
  foot: string | null;
  joined: string | null;
  contractUntil: string | null;
  marketValue: string | null; // kaynak formatında, ör. "€8.00M"
  marketValueEur: number | null;
}

const MONTHS: Record<string, number> = {
  oca: 1, şub: 2, mar: 3, nis: 4, may: 5, haz: 6, tem: 7, ağu: 8, eyl: 9, eki: 10, kas: 11, ara: 12,
};

function parseTrDate(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]{3})\w*\s+(\d{4})/);
  if (!m) return null;
  const mon = MONTHS[m[2].toLocaleLowerCase("tr-TR").slice(0, 3)];
  if (!mon) return null;
  return `${m[3]}-${String(mon).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function parseEur(s: string | null): number | null {
  if (!s) return null;
  const m = s.replace(/\s/g, "").match(/€([\d.,]+)([MK])?/i);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] ?? "").toUpperCase();
  return Math.round(n * (unit === "M" ? 1_000_000 : unit === "K" ? 1_000 : 1));
}

export function ageFromBirth(iso: string | null, now = new Date()): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d)) age -= 1;
  return age;
}

const clean = (cell: string) =>
  cell
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

export function parseMarketTable(markdown: string): MarketInfo[] {
  const out: MarketInfo[] = [];
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("| ")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 9 || !/^\d{1,2}$/.test(cells[0])) continue;
    const nameCell = clean(cells[1]);
    const name = nameCell.replace(/\s+(Kaleci|Defans|Orta Saha|Forvet)$/i, "").trim();
    if (!name) continue;
    const birthMatch = cells[2].match(/^(.+?)\s*\((\d{1,3})\)\s*$/);
    const flag = cells[3].match(/Image \d+:\s*([^\]]+)\]/);
    const mv = cells[cells.length - 1].match(/€[\d.,]+\s?[MK]?/i)?.[0] ?? null;
    const birthDate = parseTrDate(birthMatch?.[1] ?? cells[2]);
    out.push({
      jersey: Number(cells[0]),
      name,
      birthDate,
      age: ageFromBirth(birthDate) ?? (birthMatch ? Number(birthMatch[2]) : null),
      nationality: flag ? flag[1].trim() : null,
      height: cells[4] && cells[4] !== "—" ? cells[4] : null,
      foot: cells[5] && cells[5] !== "—" ? cells[5] : null,
      joined: parseTrDate(cells[6]),
      contractUntil: parseTrDate(cells[8]),
      marketValue: mv,
      marketValueEur: parseEur(mv),
    });
  }
  return out;
}

export async function getMarketInfo(): Promise<MarketInfo[]> {
  return cached("market:trabzon.org", 6 * 3600_000, async () => {
    const md = await fetchText(READER, { timeoutMs: 25_000, headers: { Accept: "text/plain" } });
    const rows = parseMarketTable(md);
    if (rows.length < 15) throw new Error("Oyuncu detay tablosu eksik okundu");
    return rows;
  });
}
