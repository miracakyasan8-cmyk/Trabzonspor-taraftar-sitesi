import { NextResponse } from "next/server";
import { getPortalData } from "@/lib/portal";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

let lastForced = 0;

/**
 * "Verileri Yenile": sunucu önbelleğini temizler ve haberleri, maçları/canlı skoru,
 * puan durumunu, kadroyu ve sosyal medya akışını eşzamanlı olarak yeniden çeker.
 * Kaynakları korumak için art arda yenilemeler 5 sn ile sınırlıdır.
 */
export async function POST() {
  const now = Date.now();
  const force = now - lastForced > 5_000;
  if (force) lastForced = now;
  const data = await getPortalData(force);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
