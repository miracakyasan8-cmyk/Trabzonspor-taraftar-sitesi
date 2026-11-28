import { getTournamentStandings } from "@/lib/espn";
import { loadFixtures } from "@/lib/portal";
import { CUP_LABEL, CUP_SLUG } from "@/lib/cup";
import { TournamentStandings } from "@/components/Standings";
import { SectionHeading } from "@/components/SectionHeading";
import { SectionError } from "@/components/SectionState";
import { Reveal } from "@/components/Reveal";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function PuanDurumuPage() {
  let tournaments = null;
  let error: string | undefined;
  const fx = await loadFixtures().catch(() => null);
  const cupMatches = fx ? [...fx.next, ...fx.recent].filter((f) => f.leagueSlug === CUP_SLUG) : [];
  try {
    tournaments = await getTournamentStandings();
  } catch (e) {
    error = e instanceof Error ? e.message : "Puan durumu alınamadı";
  }
  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
      <SectionHeading
        index="04"
        kicker="Aktif Kulvarlar"
        title="Puan"
        accent="Durumu"
        description="Trabzonspor'un mücadele ettiği tüm turnuvaların güncel tabloları — Süper Lig ve katıldığı Avrupa/kupa organizasyonları. Tüm takımlar yüksek çözünürlüklü resmî armalarıyla; Trabzonspor satırı bordo-mavi vurgulu."
      />
      {cupMatches.length ? (
        <p className="mb-6 rounded-2xl border border-mavi/25 bg-mavi/10 px-4 py-3 text-xs font-semibold text-mavi-200">
          Trabzonspor {CUP_LABEL}&apos;nda da mücadele ediyor ({cupMatches.length} maç). Kupa eleme usulü oynandığı için puan tablosu yoktur; kupa maçları Oynanmış ve Oynanacak Maçlar sekmelerinde yer alır.
        </p>
      ) : null}
      {tournaments ? (
        <Reveal>
          <TournamentStandings tournaments={tournaments} />
        </Reveal>
      ) : (
        <SectionError title="Puan durumu alınamadı" message={error} />
      )}
    </div>
  );
}
