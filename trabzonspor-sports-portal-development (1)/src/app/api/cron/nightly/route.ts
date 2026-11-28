import { NextResponse } from "next/server";
import { runNightlyRefresh } from "@/lib/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Gece yarısı döngüsünün harici tetikleyicisi (cron-job servisi, Vercel cron, GitHub Actions vb.).
 * `Authorization: Bearer <CRON_SECRET>` başlığı beklenir.
 * Harici zamanlayıcı: 21:00 UTC = ertesi gün 00:00 Europe/Istanbul.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
  }
  const result = await runNightlyRefresh("http");
  return NextResponse.json({ ok: true, ...result });
}
