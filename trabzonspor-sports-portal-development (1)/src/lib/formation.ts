/**
 * Resmî diziliş slotuna (Opta/ESPN `formationPlace`) göre saha koordinatları.
 * Hücum yukarı doğrudur; x: 0 = takımın solu, 100 = sağı; y: 0 = rakip kale, 100 = kendi kalesi.
 *
 * ESPN pozisyon kısaltmaları güvenilmezdir (örn. 4-2-3-1'deki iki ön libero "LM/RM" gelir).
 * Bu yüzden önce doğrulanmış slot tabloları, yoksa formasyon dizesinden satır kurulumu kullanılır.
 */

export interface Slot {
  x: number;
  y: number;
}

export interface PlacedPlayer<T> {
  player: T;
  x: number;
  y: number;
}

const GK: Slot = { x: 50, y: 90 };
const BACK_FOUR: Record<number, Slot> = {
  3: { x: 13, y: 70 }, // sol bek
  6: { x: 37, y: 74 }, // sol stoper
  5: { x: 63, y: 74 }, // sağ stoper
  2: { x: 87, y: 70 }, // sağ bek
};

/** Trabzonspor maç verileriyle doğrulanmış tablolar */
const TABLES: Record<string, Record<number, Slot>> = {
  "4-3-3": {
    1: GK,
    ...BACK_FOUR,
    4: { x: 50, y: 53 },
    8: { x: 25, y: 47 },
    7: { x: 75, y: 47 },
    11: { x: 17, y: 21 },
    9: { x: 50, y: 15 },
    10: { x: 83, y: 21 },
  },
  "4-1-4-1": {
    1: GK,
    ...BACK_FOUR,
    4: { x: 50, y: 57 },
    11: { x: 12, y: 39 },
    10: { x: 37, y: 41 },
    8: { x: 63, y: 41 },
    7: { x: 88, y: 39 },
    9: { x: 50, y: 15 },
  },
  "4-2-3-1": {
    1: GK,
    ...BACK_FOUR,
    4: { x: 36, y: 55 },
    8: { x: 64, y: 55 },
    11: { x: 15, y: 34 },
    10: { x: 50, y: 36 },
    7: { x: 85, y: 34 },
    9: { x: 50, y: 14 },
  },
};

const DEPTH: [RegExp, number][] = [
  [/^G$/, 0],
  [/^(CD|SW|D)(-[LR])?$|^[LR]B$/, 1],
  [/^[LR]WB$/, 1.6],
  [/^DM(-[LR])?$/, 2],
  [/^(CM|M)(-[LR])?$|^[LR]M$/, 3],
  [/^AM(-[LR])?$/, 4],
  [/^(F|CF|ST)(-[LR])?$|^[LR]F$|^[LR]W$/, 5],
];

const depthOf = (pos: string | null) => {
  const p = (pos ?? "").toUpperCase();
  return DEPTH.find(([re]) => re.test(p))?.[1] ?? 3;
};
const sideOf = (pos: string | null) => {
  const p = (pos ?? "").toUpperCase();
  if (/^L|-L$/.test(p)) return 0;
  if (/^R|-R$/.test(p)) return 2;
  return 1;
};

function spread(count: number) {
  if (count === 1) return [50];
  const margin = count >= 5 ? 10 : count === 4 ? 14 : 22;
  return Array.from({ length: count }, (_, i) => margin + (i * (100 - 2 * margin)) / (count - 1));
}

/**
 * Oyuncuları sahaya yerleştirir. Hiçbir oyuncu atlanmaz; tablo slotu eksikse yedek yerleşim
 * otomatik devreye girer.
 */
export function placeLineup<T extends { place: number | null; position: string | null }>(
  formation: string | null,
  starters: T[],
): PlacedPlayer<T>[] {
  const table = formation ? TABLES[formation.trim()] : undefined;
  if (table && starters.every((p) => p.place != null && table[p.place])) {
    return starters.map((player) => ({ player, ...table[player.place as number] }));
  }

  // Yedek: kaleci + formasyon satırları (örn. "3-5-2" → [3,5,2])
  const keeper = starters.find((p) => depthOf(p.position) === 0) ?? starters.find((p) => p.place === 1);
  const outfield = starters
    .filter((p) => p !== keeper)
    .sort((a, b) => depthOf(a.position) - depthOf(b.position) || (a.place ?? 99) - (b.place ?? 99));
  const rows = (formation ?? "")
    .split("-")
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
  const counts = rows.reduce((t, n) => t + n, 0) === outfield.length ? rows : [4, 3, 3];

  const placed: PlacedPlayer<T>[] = keeper ? [{ player: keeper, ...GK }] : [];
  let cursor = 0;
  counts.forEach((count, rowIndex) => {
    const row = outfield.slice(cursor, cursor + count).sort((a, b) => sideOf(a.position) - sideOf(b.position));
    cursor += count;
    const y = 72 - (rowIndex * 58) / Math.max(1, counts.length - 1);
    spread(row.length).forEach((x, i) => placed.push({ player: row[i], x, y }));
  });
  // Formasyon sayımı uymazsa kalan oyuncuları da göster
  outfield.slice(cursor).forEach((player, i) => placed.push({ player, x: 20 + i * 15, y: 50 }));
  return placed;
}
