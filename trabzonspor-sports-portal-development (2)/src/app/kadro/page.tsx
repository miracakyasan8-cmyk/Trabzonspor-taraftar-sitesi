import { getLiveSquad } from "@/lib/squad";
import { SquadSection } from "@/components/SquadSection";
import { SectionHeading } from "@/components/SectionHeading";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function KadroPage() {
  let squad = null;
  let error: string | undefined;
  try {
    squad = await getLiveSquad();
  } catch (e) {
    error = e instanceof Error ? e.message : "Resmî kadro alınamadı";
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
      <SectionHeading
        index="05"
        kicker="Resmî A Takım"
        title="Fotoğraflı"
        accent="Kadro"
        description="Resmî kadro, mevkilere göre. Oyuncuya dokun: fotoğraf, Trabzonspor istatistikleri, Transfermarkt."
      />
      <SquadSection squad={squad} error={error} />
    </div>
  );
}
