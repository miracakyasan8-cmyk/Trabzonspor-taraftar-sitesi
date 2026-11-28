import { clearCache } from "./cache";
import { getPortalData } from "./portal";
import { getLiveSquad } from "./squad";

/** 00:00 TSİ — Türkiye 2016'dan beri yıl boyunca UTC+03:00 kullanır. */
export function msUntilMidnightIstanbul(now = new Date()) {
  const local = new Date(now.getTime() + 3 * 3_600_000);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1);
  return Math.max(1, midnight - local.getTime());
}

const runtime = globalThis as unknown as {
  __nightlyTimer?: ReturnType<typeof setTimeout>;
  __nightlyLastRun?: string;
  __nightlyRunning?: Promise<Awaited<ReturnType<typeof nightly>>>;
};

export function lastNightlyRun() {
  return runtime.__nightlyLastRun ?? null;
}

async function nightly(origin: string) {
  const started = new Date().toISOString();
  console.info(`[nightly-refresh] ${origin}: ${started}`);
  // Önbellek tamamen sıfırlanır; tüm kaynaklar (resmî kadro + mağaza dâhil) yeniden okunur.
  clearCache();
  const squad = await getLiveSquad().catch(() => null);
  const data = await getPortalData(false);
  runtime.__nightlyLastRun = started;
  const keys = ["fixtures", "standings", "squad", "news", "social", "store"] as const;
  const results = Object.fromEntries(
    keys.map((key) => [key, data.errors[key] ? "failed" : data.sources.find((s) => s.key === key)?.stale ? "stale" : "ok"]),
  );
  console.info("[nightly-refresh] tamamlandı", JSON.stringify(results), `eski veri: ${data.staleCount}`);
  if (squad) {
    console.info(`[nightly-refresh] resmî kadro: ${squad.players.length} oyuncu, ${squad.newCount} yeni transfer, kaynak=${squad.source}`);
  }
  return { origin, ranAt: started, durationMs: data.durationMs, results, staleCount: data.staleCount, errors: data.errors, updatedAt: data.updatedAt };
}

/** Süreç zamanlayıcısı ve harici cron aynı anda gelirse tek çalışma paylaşılır. */
export function runNightlyRefresh(origin = "cron") {
  if (runtime.__nightlyRunning) return runtime.__nightlyRunning;
  const run = nightly(origin).finally(() => {
    if (runtime.__nightlyRunning === run) runtime.__nightlyRunning = undefined;
  });
  runtime.__nightlyRunning = run;
  return run;
}

/** Uzun yaşayan Node sunucusu için; serverless dağıtımlarda harici cron ucu kullanılır. */
export function scheduleNightly() {
  if (runtime.__nightlyTimer) return;
  const arm = () => {
    const delay = msUntilMidnightIstanbul();
    console.info(`[nightly-refresh] sonraki çalışma: ${new Date(Date.now() + delay).toISOString()} (00:00 TSİ)`);
    const timer = setTimeout(async () => {
      try { await runNightlyRefresh("timer"); }
      catch (error) { console.error("[nightly-refresh] hata", error); }
      finally { arm(); }
    }, delay);
    timer.unref?.();
    runtime.__nightlyTimer = timer;
  };
  arm();
}
