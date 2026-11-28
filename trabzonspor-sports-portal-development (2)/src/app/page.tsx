import { loadFixtures } from "@/lib/portal";
import { Hero } from "@/components/Hero";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tek ekranlık karşılama: başka haber/puan/mağaza akışı bu sayfada yüklenmez. */
export default async function HomePage() {
  let fixtures = null;
  let error: string | undefined;
  try {
    fixtures = await loadFixtures();
  } catch {
    error = "Canlı maç kaynağına şu anda ulaşılamıyor.";
  }
  return (
    <>
      <Hero fixtures={fixtures} error={error} />
    </>
  );
}
