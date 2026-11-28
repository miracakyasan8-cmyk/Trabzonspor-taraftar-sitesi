import { NextResponse } from "next/server";
import { getFixtureById } from "@/lib/portal";
import { getLineup } from "@/lib/espn";

export const dynamic = "force-dynamic";

/** Maç detay penceresi: GET /api/lineup?event=<id> — açıklanmışsa ilk 11 + yedekler. */
export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get("event");
  if (!eventId) return NextResponse.json({ error: "Maç kimliği gerekli" }, { status: 400 });
  try {
    const fixture = await getFixtureById(eventId);
    if (!fixture) return NextResponse.json({ error: "Maç bulunamadı" }, { status: 404 });
    const lineup = await getLineup(fixture);
    return NextResponse.json(
      { fixture, lineup },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Maç detayı alınamadı" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
