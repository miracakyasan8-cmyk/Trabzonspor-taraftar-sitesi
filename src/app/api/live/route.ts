import { NextResponse } from "next/server";
import { getLiveMatchCenter, getLiveSnapshot } from "@/lib/live";

export const dynamic = "force-dynamic";

/**
 * GET /api/live            → hafif anlık görüntü (ana sayfa 15 sn'de bir sorgular)
 * GET /api/live?event=<id> → Canlı Maç Merkezi: iki takımın ilk 11'i, yedekler, olaylar, doğrulama
 */
export async function GET(req: Request) {
  const event = new URL(req.url).searchParams.get("event");
  try {
    if (event) {
      if (!/^[\w-]{3,40}$/.test(event)) {
        return NextResponse.json({ ok: false, error: "Geçersiz maç kimliği" }, { status: 400 });
      }
      const center = await getLiveMatchCenter(event);
      return NextResponse.json({ ok: true, ...center }, { headers: { "Cache-Control": "no-store" } });
    }
    const snapshot = await getLiveSnapshot();
    return NextResponse.json({ ok: true, ...snapshot }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, live: null, verification: null, error: e instanceof Error ? e.message : "Canlı veri alınamadı" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
