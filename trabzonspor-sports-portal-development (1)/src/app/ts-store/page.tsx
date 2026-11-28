import type { Metadata } from "next";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { getStoreCatalog } from "@/lib/store";
import { isStale } from "@/lib/cache";
import { STORE_URL } from "@/lib/store-types";
import { recordUpdatedAt } from "@/lib/portal";
import { StoreCatalog } from "@/components/StoreCatalog";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const metadata: Metadata = {
  title: "TS Store — FIRTINA61",
  description: "Trabzonspor'un yeni sezon formaları, antrenman ürünleri ve lisanslı koleksiyonları. Resmî TS Club kataloğundan güncel Türk lirası fiyatlar ve doğrudan mağaza bağlantıları.",
};

export default async function TSStorePage() {
  try {
    const catalog = await getStoreCatalog();
    recordUpdatedAt(catalog.checkedAt);
    const stale = isStale("store:");
    return (
      <>
        {stale ? (
          <p className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
            <span className="block rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs font-semibold text-amber-200">
              Resmî mağaza şu an yanıt vermiyor; en son başarılı katalog (fiyatlar dâhil) gösteriliyor ve arka planda yeniden deneniyor. Kesin fiyat için ürün sayfasını açın.
            </span>
          </p>
        ) : null}
        <StoreCatalog catalog={catalog} />
      </>
    );
  } catch (error) {
    console.error("[TS Store] Sayfa kataloğu alınamadı", error);
    return (
      <section className="mx-auto max-w-4xl px-5 py-20 text-center">
        <ShoppingBag size={32} className="mx-auto mb-5 text-mavi" />
        <h1 className="font-display text-5xl uppercase text-bone">TS <span className="gradient-text">Store</span></h1>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-muted">Resmî mağaza kataloğuna şu anda ulaşılamıyor. Güncelliği doğrulanamayan ürün ve fiyatlar gösterilmiyor. Üstteki Verileri Yenile düğmesiyle yeniden deneyebilirsin.</p>
        <a href={STORE_URL} target="_blank" rel="noopener noreferrer" className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full bg-bordo px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-bordo-400">Resmî Mağazaya Git<ExternalLink size={15} /></a>
      </section>
    );
  }
}
