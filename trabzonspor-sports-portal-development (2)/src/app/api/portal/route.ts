import { NextResponse } from "next/server";
import { getPortalData } from "@/lib/portal";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Önbellekten (TTL'li) tüm portal verisi */
export async function GET() {
  const data = await getPortalData(false);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
