import { NextResponse } from "next/server";
import { getMatchDetail, type MatchPlayerFull } from "@/lib/espn";
import { loadFixtures } from "@/lib/portal";
import { getLiveSquad } from "@/lib/squad";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Maç detayı: GET /api/match?event=<resmî maç ID>
 * Kadro ve olaylar yalnızca bu ID'nin resmî maç özetinden gelir. Trabzonspor oyuncuları,
 * aynı ESPN oyuncu kimliği üzerinden resmî kulüp kadrosuna bağlanarak güncel profil
 * fotoğrafı ve resmî adıyla zenginleştirilir (isim tahmini yapılmaz).
 */
export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get("event");
  if (!eventId || !/^[\w-]{3,40}$/.test(eventId)) {
    return NextResponse.json({ error: "Geçerli bir maç kimliği gerekli" }, { status: 400 });
  }
  try {
    const fx = await loadFixtures();
    const fixture = [...(fx.live ? [fx.live] : []), ...fx.next, ...fx.recent].find((f) => f.id === eventId);
    if (!fixture) return NextResponse.json({ error: "Maç bulunamadı" }, { status: 404 });

    const [detail, squad] = await Promise.all([getMatchDetail(fixture), getLiveSquad().catch(() => null)]);
    const byEspn = new Map((squad?.players ?? []).filter((p) => p.espnId).map((p) => [p.espnId as string, p]));

    const enrich = (p: MatchPlayerFull): MatchPlayerFull => {
      const official = byEspn.get(p.id);
      return official
        ? { ...p, name: official.name, photo: official.photo ?? p.headshot }
        : { ...p, photo: p.headshot };
    };

    return NextResponse.json(
      {
        ...detail,
        tsLineup: detail.tsLineup
          ? { ...detail.tsLineup, starters: detail.tsLineup.starters.map(enrich), subs: detail.tsLineup.subs.map(enrich) }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Maç detayı alınamadı" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
