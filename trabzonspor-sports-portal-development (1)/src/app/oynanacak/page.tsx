import { loadFixtures } from "@/lib/portal";
import { getMatchDetail } from "@/lib/espn";
import { UpcomingFixtures } from "@/components/UpcomingFixtures";
import { SectionHeading } from "@/components/SectionHeading";
import { SectionError } from "@/components/SectionState";
import { LiveBanner, LivePill } from "@/components/LiveBanner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function OynanacakPage() {
  let fixtures = null;
  let live = null;
  let error: string | undefined;
  let announced: string[] = [];
  try {
    const fx = await loadFixtures();
    fixtures = fx.next;
    live = fx.live;
    // Maça ≤ 48 saat kala resmî maç kadrosu açıklandı mı? (gerçek maç ID'si üzerinden)
    const soon = fx.next.filter((f) => +new Date(f.date) - Date.now() < 48 * 3600_000);
    const checks = await Promise.all(
      soon.map((f) => getMatchDetail(f).then((d) => ((d.tsLineup?.starters.length ?? 0) >= 11 ? f.id : null)).catch(() => null)),
    );
    announced = checks.filter((x): x is string => Boolean(x));
  } catch (e) {
    error = e instanceof Error ? e.message : "Fikstür alınamadı";
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
      <LiveBanner initialId={live?.id ?? null} />
      {live ? (
        <div className="mb-6">
          <LivePill live={live} />
        </div>
      ) : null}
      <SectionHeading
        index="03"
        kicker="Gelecek Fikstür"
        title="Oynanacak"
        accent="Maçlar"
        description="Yayıncı kanal her kartın üstünde. Resmî kadro açıklandığında sahadaki 11 görünür."
      />
      {fixtures ? (
        fixtures.length ? (
          <UpcomingFixtures fixtures={fixtures} announced={announced} />
        ) : (
          <p className="rounded-2xl border border-white/8 bg-ink-850/70 p-10 text-center text-sm text-muted">
            Takvimde yaklaşan maç bulunamadı.
          </p>
        )
      ) : (
        <SectionError title="Fikstür alınamadı" message={error} />
      )}
    </div>
  );
}
