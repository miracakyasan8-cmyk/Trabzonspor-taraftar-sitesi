import { cached } from "./cache";
import { fetchFeed, googleNewsUrl } from "./rss";
import type { Broadcast, Fixture } from "./types";

/**
 * Yayıncı kanal çözümleme.
 * 1) ESPN yayın verisi (varsa) — fikstür katmanında zaten işlenir.
 * 2) Maça ≤ 8 gün kala Google Haberler başlıklarında geçen açık kanal bilgisi (ör. "beIN Sports 1").
 * 3) Bulunamazsa: Süper Lig'in tek yayıncısı beIN Sports "kanal numarası yakında" notuyla gösterilir;
 *    diğer organizasyonlarda kanal uydurulmaz ("açıklanmadı").
 */

const CHANNELS: { re: RegExp; name: (m: RegExpMatchArray) => string }[] = [
  {
    re: /be[ıi]n\s*sports?\s*(haber|max\s*\d|\d)(?!\d)/i,
    name: (m) => {
      const v = m[1].toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
      if (v === "haber") return "beIN Sports Haber";
      if (v.startsWith("max")) return `beIN Sports ${v.replace("max", "Max")}`;
      return `beIN Sports ${v}`;
    },
  },
  { re: /\btrt\s*spor(?:\s*yıldız)?/i, name: (m) => m[0].replace(/\s+/g, " ").replace(/spor/i, "Spor").replace(/trt/i, "TRT").replace(/yıldız/i, "Yıldız") },
  { re: /\btrt\s*1(?!\d)/i, name: () => "TRT 1" },
  { re: /\ba\s*spor\b/i, name: () => "A Spor" },
  { re: /\batv\b/i, name: () => "ATV" },
  { re: /\bs\s*sport(?:\s*plus)?\b/i, name: (m) => (/plus/i.test(m[0]) ? "S Sport Plus" : "S Sport") },
  { re: /\btabii\b/i, name: () => "Tabii" },
];

const ascii = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9 ]+/g, " ");

const STOP = new Set(["fk", "sk", "bb", "sfk", "istanbul", "caykur", "red", "star", "fc", "ac", "as"]);

/** Rakip adından başlıkta aranacak ayırt edici anahtar sözcük */
function keyword(name: string) {
  const tokens = ascii(name)
    .split(" ")
    .filter((t) => t.length > 2 && !STOP.has(t));
  return tokens.sort((a, b) => b.length - a.length)[0] ?? ascii(name).trim();
}

function fallbackFor(f: Fixture): Broadcast {
  if (f.leagueSlug === "tur.1") {
    return {
      channel: "beIN Sports",
      confirmed: false,
      note: "Süper Lig yayıncısı — kanal numarası maç haftası netleşir",
    };
  }
  return { channel: null, confirmed: false, note: "Yayıncı henüz açıklanmadı" };
}

async function searchChannel(f: Fixture): Promise<string | null> {
  const opponent = f.tsIsHome ? f.away : f.home;
  const kw = keyword(opponent.name);
  const q = `Trabzonspor ${opponent.name} beIN Sports kanal when:8d`;
  const { items } = await fetchFeed(googleNewsUrl(q));

  const votes = new Map<string, number>();
  for (const it of items) {
    const t = ascii(it.title);
    if (!t.includes("trabzon") || !t.includes(kw)) continue;
    for (const ch of CHANNELS) {
      const m = it.title.match(ch.re);
      if (m) {
        const name = ch.name(m);
        votes.set(name, (votes.get(name) ?? 0) + 1);
        break;
      }
    }
  }
  const best = Array.from(votes.entries()).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

export async function resolveBroadcasts(fixtures: Fixture[]): Promise<Fixture[]> {
  return Promise.all(
    fixtures.map(async (f) => {
      if (f.tv?.confirmed) return f;
      const daysAway = (+new Date(f.date) - Date.now()) / 86_400_000;

      if (f.state === "post") return f; // bitmiş maçta yalnızca kaynağın verdiği yayıncı kalır
      if (daysAway > 8) return { ...f, tv: fallbackFor(f) };
      const channel = await cached(`tv:${f.id}`, 30 * 60_000, () => searchChannel(f)).catch(() => null);
      return {
        ...f,
        tv: channel
          ? { channel, confirmed: true, note: "Haber kaynaklarında duyurulan kanal" }
          : fallbackFor(f),
      };
    }),
  );
}
