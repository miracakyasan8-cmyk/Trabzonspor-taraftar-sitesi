import { LoaderCircle } from "lucide-react";

export default function StoreLoading() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center gap-4 px-6 text-center" role="status">
      <LoaderCircle size={30} className="animate-spin text-mavi" />
      <h1 className="font-display text-3xl uppercase text-bone">TS Store</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted">Resmî mağazadan ürünler, görseller ve güncel fiyatlar alınıyor…</p>
    </div>
  );
}
