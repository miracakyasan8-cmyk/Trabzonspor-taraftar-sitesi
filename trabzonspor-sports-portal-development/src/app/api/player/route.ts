import { NextResponse } from "next/server";
import { getPlayerDetail } from "@/lib/players";

export const dynamic = "force-dynamic";

/** Oyuncu mini profili: GET /api/player?id=<espnId> */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Oyuncu kimliği gerekli" }, { status: 400 });
  try {
    const detail = await getPlayerDetail(id);
    return NextResponse.json(detail, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Oyuncu bilgisi alınamadı" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
