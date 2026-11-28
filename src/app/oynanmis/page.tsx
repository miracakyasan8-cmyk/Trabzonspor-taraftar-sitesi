import { loadFixtures } from "@/lib/portal";
import { MatchArchive } from "@/components/MatchArchive";
import { LiveBanner, LivePill } from "@/components/LiveBanner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function OynanmisPage() {
  let fixtures = null;
  let error: string | undefined;
  try {
    const fx = await loadFixtures();
    fixtures = [...fx.recent, ...(fx.live ? [fx.live] : [])];
  } catch (e) {
    error = e instanceof Error ? e.message : "Arşiv alınamadı";
  }
  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
      <LiveBanner initialId={null} />
      <MatchArchive fixtures={fixtures} error={error} />
    </div>
  );
}
