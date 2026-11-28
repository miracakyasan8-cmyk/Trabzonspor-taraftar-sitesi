/**
 * 00:00 Europe/Istanbul'da çıkacak sunucunun canlı zamanlayıcısını kurar.
 * Next.js `instrumentation.ts` hook'u sürece yüklenir — sunucu kapanana kadar çalışır.
 * `src/lib/cron.ts` tüm gece yarısı mantığını taşır.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NIGHTLY_REFRESH_DISABLED !== "1") {
    const { scheduleNightly } = await import("./lib/cron");
    scheduleNightly();
  }
}
