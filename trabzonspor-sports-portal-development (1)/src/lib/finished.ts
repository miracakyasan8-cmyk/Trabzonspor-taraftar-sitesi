import type { Fixture } from "./types";

/**
 * Az önce biten maçların geçici kaydı.
 *
 * Canlı bir maç sona erdiğinde ESPN takvimi birkaç dakika geriden güncellenebilir. Bu sırada
 * maç "Oynanmış" arşivinde görünmeyebilir. Canlı katman, maç canlıdan çıktığında son bilinen
 * halini burada tutar; arşiv bu kaydı, ESPN kesin sonucu yayımlayana kadar gösterir.
 */

const KEY = "__f61Finished";
const TTL_MS = 6 * 3600_000;

interface Entry {
  fixture: Fixture;
  savedAt: number;
}

const store = (): Map<string, Entry> => {
  const g = globalThis as unknown as Record<string, Map<string, Entry> | undefined>;
  return (g[KEY] ??= new Map<string, Entry>());
};

export function rememberFinished(fixture: Fixture) {
  store().set(fixture.id, { fixture: { ...fixture, state: "post", clock: null, phase: "Maç Sonu" }, savedAt: Date.now() });
}

/** Süresi dolmamış geçici kayıtlar. ESPN'in kendi kaydı geldiğinde `known` kimlikleri verilip atılır. */
export function provisionalFinished(known: Set<string>): Fixture[] {
  const out: Fixture[] = [];
  for (const [id, entry] of store()) {
    if (Date.now() - entry.savedAt > TTL_MS || known.has(id)) {
      store().delete(id);
      continue;
    }
    out.push(entry.fixture);
  }
  return out;
}
