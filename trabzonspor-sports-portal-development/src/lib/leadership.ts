import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leadershipObservations } from "@/db/schema";
import { cached } from "./cache";
import { fetchText } from "./http";
import { fetchJson } from "./http";

/**
 * Resmî yönetim organı: Başkan + Teknik Direktör.
 * - Başkan: Trabzonspor Kulübü'nün resmî yönetim sayfasından (fotoğraflı).
 * - Teknik direktör: Wikipedia infobox'ında adı; İngilizce Wikipedia'dan doğum tarihi,
 *   boy, göreve geliş ve önceki kulüpler. Fotoğraf ve doğrulanan Transfermarkt bağlantısı.
 *
 * Yenileme her tetiklendiğinde kaynaklar yeniden okunur. İsim değiştiğinde gözlem tablosu
 * değişimi kaydeder → kartta "Yeni" etiketi çıkar (sayfa yeniden açıldığında).
 */

const READER = (url: string) => `https://r.jina.ai/${url}`;
const BOARD_URL = "https://www.trabzonspor.org.tr/tr/yonetim/yonetim-kurulu";
const INFOBOX_URL = "https://en.wikipedia.org/wiki/Trabzonspor";

export type LeadershipRole = "president" | "coach";

export interface LeadershipFigure {
  role: LeadershipRole;
  roleLabel: string;
  name: string;
  title: string;
  photo: string | null;
  profileUrl: string | null;
  sourceUrl: string;
  detail: { label: string; value: string }[];
  tmUrl: string | null;
  changed: boolean;
  stale: boolean;
}

type Status = "ok" | "stale";

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function parseBoardPresident(markdown: string): { name: string; photo: string | null; profileUrl: string | null } | null {
  const m = markdown.match(/^### Başkan\s*\n[\s\S]*?\[!\[Image \d+:([^\]]*)\]\((https:\/\/cdn\.trabzonspor\.org\.tr\/[^)]+\.(?:png|jpe?g|webp))\)\s*###\s*([^\]\s][^\]]+?)\]\((https:\/\/www\.trabzonspor\.org\.tr\/[^)\s]+)\)/m);
  if (!m) return null;
  const photo = m[2];
  const name = clean(m[3].replace(/Başkan\s*$/i, ""));
  const slug = m[4].split("/").pop() ?? null;
  if (!name) return null;
  return { name, photo, profileUrl: slug ? m[4] : null };
}

function parseCoachPage(markdown: string): {
  name: string;
  birth: string | null;
  height: string | null;
  birthIso: string | null;
  clubs: { years: string; team: string }[];
  startYear: string | null;
  photo: string | null;
} | null {
  const name = markdown.split("\n").find((l) => /^Full name/.test(l.trim()))?.replace(/^\D*\d*\s*Full name\s*/, "").trim();
  if (!name) return null;
  const birthLine = markdown.split("\n").find((l) => /^Date of birth/i.test(l.trim()));
  const birth = birthLine?.replace(/^[^0-9]*/, "").replace(/\s*\(age \d+\)\s*$/i, "").trim() ?? null;
  const heightLine = markdown.split("\n").find((l) => /^Height/i.test(l.trim()));
  const height = heightLine?.match(/(\d+(?:\.\d+)?\s*m)/i)?.[1] ?? null;
  const birthIso = birth ? isoFromEnDate(birth) : null;
  const careerBlock = markdown.split(/Managerial career/i)[1]?.split(/\n\s*\*?\s*Club domestic/i)?.[0] ?? "";
  const items = [...careerBlock.matchAll(/(\d{4})(?:\s*[–—-]\s*(\d{4}|günümüz|günümüz))?\s*\[([^\]]+)\]\(/g)]
    .map((m) => ({ years: m[2] ? `${m[1]}–${m[2]}` : m[1], team: m[3].trim() }))
    .filter((c) => c.team);
  const startYear = items.length ? items[items.length - 1].years.split("–")[0] : null;
  const photo = markdown.match(/!\[Image 1\]\((https:\/\/thumb\.wikimedia\.org\/[^)]+\.(?:png|jpe?g|webp))/)?.[1] ?? null;
  return { name, birth, height, birthIso, clubs: items, startYear, photo };
}

const MONTHS_EN: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function isoFromEnDate(s: string): string | null {
  const m = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const mon = MONTHS_EN[m[2].toLocaleLowerCase("en-US")];
  if (!mon) return null;
  return `${m[3]}-${String(mon).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function trDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function trAge(iso: string | null, now = new Date()): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d)) age -= 1;
  return age;
}

function trFromTrDate(s: string): string | null {
  const m = s.match(/^(\d{1,2})\s+([A-Za-zçğıöşü]+)\s+(\d{4})/);
  if (!m) return null;
  const months: Record<string, number> = {
    oca: 1, ocak: 1, şub: 2, Şub: 2, sub: 2, mar: 3, nis: 4, may: 5, haz: 6, tem: 7, ağu: 8, "ağustos": 8, eyl: 9, ekim: 10, eki: 10, kas: 11, ara: 12,
  };
  const mon = months[m[2].toLocaleLowerCase("tr-TR").slice(0, 3)] ?? months[m[2].toLocaleLowerCase("tr-TR")];
  if (!mon) return null;
  return `${m[3]}-${String(mon).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** Resmî Wikipedia bilgi kutusundan teknik direktör adını okur. */
async function readInfobox(): Promise<{ manager: string | null }> {
  const md = await fetchText(READER(INFOBOX_URL), { retries: 3, timeoutMs: 25_000, headers: { Accept: "text/plain" } });
  const manager = md.match(/(?:head coach|head-coach|manager)\s*\[([^\]]+)\]/i)?.[1]?.trim() ?? null;
  const cleanName = (s: string | null) => (s ? s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1").replace(/[^\p{L} .'-]/gu, "").trim() : null);
  const mgr = cleanName(manager);
  return { manager: mgr && mgr.toLowerCase() !== "head coach" && mgr.toLowerCase() !== "manager" ? mgr : null };
}

async function readPresident(): Promise<{ name: string; photo: string | null; profileUrl: string | null } | null> {
  const board = await fetchText(READER(BOARD_URL), { retries: 3, timeoutMs: 20_000, headers: { Accept: "text/plain" } }).catch(() => "");
  return parseBoardPresident(board);
}

async function readPresidentDetail(name: string): Promise<{ birthDate: string | null; birthDateRaw: string | null }> {
  try {
    // Resmî board büyük harf gösterir; Wikipedia başlığı title-case. "Ertuğrul DOĞAN" -> "Ertuğrul_Doğan"
    const titleSlug = name
      .split(/\s+/)
      .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1).toLocaleLowerCase("tr-TR"))
      .join("_");
    const url = `https://tr.wikipedia.org/wiki/${encodeURIComponent(titleSlug)}`;
    const md = await fetchText(READER(url), { retries: 2, timeoutMs: 20_000, headers: { Accept: "text/plain" } });
    const m = md.match(/\|\s*Doğum\s*\|\s*([^|]+?)\s*\|/);
    if (!m) return { birthDate: null, birthDateRaw: null };
    const raw = clean(m[1]).replace(/\([^)]+\)/g, "");
    const iso = trFromTrDate(raw);
    return { birthDate: iso, birthDateRaw: raw || null };
  } catch {
    return { birthDate: null, birthDateRaw: null };
  }
}

async function readCoach(): Promise<{ name: string | null; info: ReturnType<typeof parseCoachPage>; wikipediaUrl: string | null; infoboxName: string | null }> {
  const infobox = await readInfobox().catch(() => ({ manager: null }));
  if (!infobox.manager) return { name: null, info: null, wikipediaUrl: null, infoboxName: null };
  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(infobox.manager.split(/\s+/).map((w) => w.charAt(0).toLocaleUpperCase("en-US") + w.slice(1).toLocaleLowerCase("en-US")).join("_"))}`;
  try {
    const md = await fetchText(READER(url), { retries: 3, timeoutMs: 20_000, headers: { Accept: "text/plain" } });
    const info = parseCoachPage(md);
    if (!info) return { name: infobox.manager, info: null, wikipediaUrl: url, infoboxName: infobox.manager };
    return { name: info.name, info, wikipediaUrl: url, infoboxName: infobox.manager };
  } catch {
    return { name: infobox.manager, info: null, wikipediaUrl: url, infoboxName: infobox.manager };
  }
}

/** Doğru Transfermarkt bağlantısı: Wikipedia makalesinin kendi Wikidata kimliği (P2446) ile. */
async function readCoachTm(name: string): Promise<string | null> {
  try {
    const slug = name.split(/\s+/).map((w) => w.charAt(0).toLocaleUpperCase("en-US") + w.slice(1).toLocaleLowerCase("en-US")).join("_");
    const page = await fetchJson<{ query?: { pages?: { pageprops?: { wikibase_item?: string } }[] } }>(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageprops&titles=${encodeURIComponent(slug)}&redirects=1`,
      { retries: 2, timeoutMs: 10_000 },
    );
    const qid = page.query?.pages?.[0]?.pageprops?.wikibase_item;
    if (!qid) return null;
    interface WbEntityRecord {
      claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>;
    }
    const ent = await fetchJson<{ entities?: Record<string, WbEntityRecord> }>(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims&format=json`,
      { retries: 2, timeoutMs: 10_000 },
    );
    const claim = ent.entities?.[qid]?.claims?.P2446?.[0]?.mainsnak?.datavalue?.value;
    const tmId = typeof claim === "string" ? claim : typeof (claim as { id?: string })?.id === "string" ? (claim as { id?: string }).id : null;
    const tmIdFinal = tmId;
    if (!tmIdFinal) return null;
    const urlName = name.toLocaleLowerCase("en-US").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return `https://www.transfermarkt.com/${urlName}/profil/spieler/${tmIdFinal}`;
  } catch {
    return null;
  }
}

/** Resmî yönetim organı — son başarılı baskıDB'ye yazılır; değişiklik algılandıysa `changed: true`. */
export async function getLeadership(): Promise<{ president: LeadershipFigure | null; coach: LeadershipFigure | null; stale: boolean }> {
  return cached("leadership:v1", 30 * 60_000, async () => {
    const stale = false;
    const [presidentBase, coachOutcome] = await Promise.all([
      readPresident().catch(() => null),
      readCoach().catch(() => ({ name: null, info: null, wikipediaUrl: null, infoboxName: null })),
    ]);

    // Başkan: resmî yönetim sayfasından fotoğraflı eşleşme
    let president: LeadershipFigure | null = null;
    if (presidentBase?.name) {
      const detail = await readPresidentDetail(presidentBase.name).catch(() => ({ birthDate: null, birthDateRaw: null }));
      const birthIso = detail.birthDate;
      const age = trAge(birthIso);
      president = {
        role: "president",
        roleLabel: "Başkan",
        name: presidentBase.name,
        title: "Trabzonspor Başkanı",
        photo: presidentBase.photo,
        profileUrl: presidentBase.profileUrl,
        sourceUrl: BOARD_URL,
        detail: [
          { label: "Görev", value: "Trabzonspor Başkanı" },
          { label: "Doğum", value: trDate(birthIso) ?? detail.birthDateRaw ?? "Bilgi yok" },
          { label: "Yaş", value: age ? `${age} yaş` : "Bilgi yok" },
        ],
        tmUrl: null,
        changed: false,
        stale,
      };
    }

    // Teknik direktör: İngilizce Wikipedia'dan doğum tarihi, boy ve önceki kulüpler
    let coach: LeadershipFigure | null = null;
    if (coachOutcome.name) {
      const info = coachOutcome.info;
      const tm = await readCoachTm(coachOutcome.name).catch(() => null);
      const birthIso = info?.birthIso ?? null;
      const clubs = (info?.clubs ?? []).slice(0, 5).reverse();
      const coachDetail = [
        { label: "Görev", value: "Trabzonspor Teknik Direktörü" },
        { label: "Doğum", value: trDate(birthIso) ?? "Bilgi yok" },
        { label: "Yaş", value: trAge(birthIso) ? `${trAge(birthIso)} yaş` : "Bilgi yok" },
        { label: "Boy", value: info?.height ?? "Bilgi yok" },
        { label: "Göreve geliş", value: info?.startYear ? `${info.startYear}` : "Bilgi yok" },
        { label: "Önceki kulüpler", value: clubs.length ? clubs.map((c) => (c.years ? `${c.team} (${c.years})` : c.team)).join(", ") : "Bilgi yok" },
      ];
      coach = {
        role: "coach",
        roleLabel: "Teknik Direktör",
        name: info?.name ?? coachOutcome.name,
        title: "Trabzonspor Teknik Direktörü",
        photo: info?.photo ?? null,
        profileUrl: coachOutcome.wikipediaUrl,
        sourceUrl: coachOutcome.wikipediaUrl ?? INFOBOX_URL,
        detail: coachDetail,
        tmUrl: tm,
        changed: false,
        stale,
      };
    }

    // Gözlem kaydı: isim değişirse değişiklik algılanır (başkan/teknik direktör yenisi)
    const track = await trackLeadership(president, coach).catch(() => ({ presidentChanged: false, coachChanged: false, stale: false }));
    if (president && track.presidentChanged) president = { ...president, changed: true };
    if (coach && track.coachChanged) coach = { ...coach, changed: true };

    return { president, coach, stale };
  });
}

async function trackLeadership(
  president: LeadershipFigure | null,
  coach: LeadershipFigure | null,
): Promise<{ presidentChanged: boolean; coachChanged: boolean; stale: boolean }> {
  return db.transaction(async (tx) => {
    const out = { presidentChanged: false, coachChanged: false, stale: false };
    for (const figure of [president, coach]) {
      if (!figure) continue;
      const role = figure.role;
      const [row] = await tx.select().from(leadershipObservations).where(eq(leadershipObservations.role, role)).limit(1);
      if (!row) {
        await tx.insert(leadershipObservations).values({ role, name: figure.name, photo: figure.photo, officialId: figure.profileUrl });
        continue;
      }
      const changed = row.name !== figure.name;
      if (changed) {
        if (role === "president") out.presidentChanged = true;
        if (role === "coach") out.coachChanged = true;
      }
      await tx
        .update(leadershipObservations)
        .set({ name: figure.name, photo: figure.photo, officialId: figure.profileUrl, updatedAt: new Date(), previousName: changed ? row.name : row.previousName })
        .where(eq(leadershipObservations.role, role));
    }
    return out;
  });
}
