import { NextResponse } from "next/server";
import { getStoreCatalog } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  try {
    return NextResponse.json(await getStoreCatalog(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[TS Store] Katalog okunamadı", error);
    return NextResponse.json(
      { error: "Resmî mağaza kataloğuna şu anda ulaşılamıyor. Lütfen yeniden deneyin." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
