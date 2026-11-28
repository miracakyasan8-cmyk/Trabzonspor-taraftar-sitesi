import { NextResponse } from "next/server";
import { getLastSources, getLastUpdated } from "@/lib/portal";
import { lastNightlyRun } from "@/lib/cron";

export const dynamic = "force-dynamic";

/** Hafif uç: son güncelleme saati, son 00:00 çalışması ve kaynak raporu (veri çekmez). */
export async function GET() {
  return NextResponse.json(
    { updatedAt: getLastUpdated(), nightly: lastNightlyRun(), sources: getLastSources() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
