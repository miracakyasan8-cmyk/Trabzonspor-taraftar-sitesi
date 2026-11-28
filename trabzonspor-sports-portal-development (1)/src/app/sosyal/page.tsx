import { getSocial } from "@/lib/social";
import { SocialSection } from "@/components/SocialSection";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function SosyalPage() {
  let social = null;
  let error: string | undefined;
  try {
    social = await getSocial();
  } catch (e) {
    error = e instanceof Error ? e.message : "Sosyal medya verisi alınamadı";
  }
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
      <SocialSection social={social} error={error} />
    </div>
  );
}
