import { getNews } from "@/lib/news";
import { NewsSection } from "@/components/NewsSection";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function HaberlerPage() {
  let news = null;
  let error: string | undefined;
  try {
    news = await getNews();
  } catch (e) {
    error = e instanceof Error ? e.message : "Haber akışı alınamadı";
  }
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
      <NewsSection news={news} error={error} />
    </div>
  );
}
