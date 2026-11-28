"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Check, Clock3, ExternalLink, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles } from "lucide-react";
import { STORE_CATEGORIES, STORE_URL, type StoreCategory, type StoreData, type StoreProduct } from "@/lib/store-types";
import { fmtTimeSec } from "@/lib/format";

const formatPrice = (value: number) => new Intl.NumberFormat("tr-TR", {
  style: "currency", currency: "TRY", minimumFractionDigits: 2,
}).format(value);

function ProductCard({ product }: { product: StoreProduct }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <article className="store-product group flex flex-col overflow-hidden rounded-[22px] border border-white/8 bg-ink-850 transition-colors hover:border-mavi/35">
      <a href={product.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-[4/4.6] overflow-hidden bg-[#f1f2f3]" aria-label={`${product.name} ürününü resmî mağazada incele`}>
        {!imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} loading="lazy" decoding="async" onError={() => setImageFailed(true)} className="store-product-image h-full w-full object-contain p-4 sm:p-5" />
        ) : (
          <span className="flex h-full items-center justify-center px-8 text-center text-xs font-semibold text-slate-600">
            Görsel mağazadan yüklenemedi. Ürünü resmî mağazada inceleyebilirsin.
          </span>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.isNew ? (
            <span title={product.sourceNew ? "Resmî mağazanın yeni ürün etiketi" : "Son 14 gün içinde vitrine eklendi"} className="flex items-center gap-1 rounded-full bg-mavi px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-ink-950">
              <Sparkles size={11} />Yeni
            </span>
          ) : null}
          {product.previousPrice ? <span className="rounded-full bg-bordo px-2.5 py-1 text-[10px] font-bold text-white">İndirimli</span> : null}
        </div>
        <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-white/85 text-ink-900 shadow-sm transition-colors group-hover:bg-mavi">
          <ArrowUpRight size={18} />
        </span>
      </a>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-mavi">{STORE_CATEGORIES[product.category]}</p>
        <h2 className="line-clamp-2 min-h-[2.8em] text-[13px] font-bold leading-snug text-bone sm:text-sm">
          <a href={product.url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-mavi-200">{product.name}</a>
        </h2>
        <div className="mb-4 mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-base font-extrabold tracking-tight text-bone sm:text-lg">{formatPrice(product.price)}</span>
          {product.previousPrice ? <del className="text-xs font-semibold text-muted">{formatPrice(product.previousPrice)}</del> : null}
        </div>
        {!product.available ? <p className="mb-2 text-[10px] font-semibold text-muted">Mağazada stok tükenmiş görünüyor.</p> : null}
        <a href={product.url} target="_blank" rel="noopener noreferrer" className="mt-auto flex items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/[0.035] px-3 py-2.5 text-[10px] font-bold text-bone transition-colors hover:border-mavi/40 hover:bg-mavi/10 hover:text-mavi sm:text-xs">
          İncele / Satın Al<ExternalLink size={12} className="shrink-0 text-mavi" />
        </a>
      </div>
    </article>
  );
}

/** Bütün görseller, ürün adları ve fiyatlar resmî TS Club sayfalarından gelir. */
export function StoreCatalog({ catalog }: { catalog: StoreData }) {
  const [category, setCategory] = useState<"all" | StoreCategory>("all");
  const [search, setSearch] = useState("");
  const [newOnly, setNewOnly] = useState(false);
  const [sort, setSort] = useState("official");
  const [limit, setLimit] = useState(24);

  const filtered = useMemo(() => {
    const query = search.toLocaleLowerCase("tr-TR").trim();
    const result = catalog.products.filter((p) => (category === "all" || category === p.category)
      && (!newOnly || p.isNew) && (!query || p.name.toLocaleLowerCase("tr-TR").includes(query)));
    if (sort === "price-asc") result.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") result.sort((a, b) => b.price - a.price);
    if (sort === "new") result.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    return result;
  }, [catalog, category, search, sort, newOnly]);

  const featured = catalog.products.find((p) => p.category === "forma" && !/çocuk|kadın|genç/i.test(p.name))
    ?? catalog.products[0];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
      {/* Katalog başlığı */}
      <section aria-labelledby="store-heading" className="relative mb-10 grid overflow-hidden rounded-[28px] border border-white/10 bg-ink-850 md:grid-cols-[1.2fr_1fr]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,rgba(138,21,56,0.3),transparent_60%)]" />
        <div className="relative flex flex-col items-start justify-center px-6 py-8 sm:px-10 sm:py-12">
          <span className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-mavi">
            <ShoppingBag size={14} />TS Store • Resmî TS Club kataloğu
          </span>
          <h1 id="store-heading" className="font-display text-5xl uppercase leading-[.97] tracking-tight sm:text-6xl lg:text-7xl">
            Armayı<br /><span className="gradient-text">üzerinde taşı.</span>
          </h1>
          <p className="mt-5 max-w-md text-xs leading-relaxed text-muted sm:text-sm">
            Yeni sezonun heyecanı, aynı renklere duyulan sevda. Formalar, antrenman ürünleri ve lisanslı koleksiyonlar doğrudan resmî mağazadan.
          </p>
          <a href={STORE_URL + "?currency=try"} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-bordo to-bordo-400 px-6 py-3 text-xs font-bold text-white shadow-[0_10px_30px_-10px_rgba(138,21,56,0.8)] transition-transform hover:scale-[1.03]">
            Resmî TS Store’a Git<ArrowUpRight size={15} />
          </a>
          <p className="mt-5 flex items-center gap-1.5 text-[10px] font-semibold text-muted"><ShieldCheck size={12} className="text-mavi" />Tüm alışveriş işlemleri trabzonspor.com.tr üzerinde yapılır.</p>
        </div>
        {featured ? (
          <a href={featured.url} target="_blank" rel="noopener noreferrer" className="group relative hidden min-h-[340px] items-center justify-center overflow-hidden bg-[#e9e9eb] p-6 md:flex" aria-label={featured.name}>
            <span className="pointer-events-none absolute -right-6 top-10 rotate-90 font-display text-[90px] leading-none tracking-wide text-ink-900/[0.05] lg:text-[110px]">BORDO MAVİ</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={featured.image} alt={featured.name} fetchPriority="high" className="relative h-[280px] w-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105 lg:h-[330px]" />
            <span className="absolute bottom-4 left-5 right-5 flex items-center justify-between gap-2 text-[10px] font-bold text-ink-900/70">
              <span className="truncate">{catalog.season ?? "Resmî mağaza seçkisi"}</span>
              <ArrowUpRight size={18} />
            </span>
          </a>
        ) : null}
      </section>

      {/* Kaynak durumu */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-ink-900/70 px-4 py-3.5 text-[11px] font-semibold text-muted">
        <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{catalog.products.length} ürün • {catalog.source}</span>
        <span className="flex items-center gap-1.5" suppressHydrationWarning><Clock3 size={12} className="text-mavi" />Katalog kontrolü: {fmtTimeSec(catalog.checkedAt)} TSİ</span>
        <span className="flex items-center gap-1.5"><Check size={12} className="text-mavi" />Manuel yenileme + her gece 00:00</span>
      </div>

      {/* Gerçek kategori filtreleri */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2" aria-label="Ürün kategorileri">
        <button onClick={() => { setCategory("all"); setLimit(24); }} aria-pressed={category === "all"} className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-bold transition-colors ${category === "all" ? "bg-mavi text-ink-950" : "border border-white/10 text-muted hover:text-bone"}`}>Tüm Ürünler</button>
        {(Object.entries(STORE_CATEGORIES) as [StoreCategory, string][]).map(([key, label]) => {
          const count = catalog.products.filter((p) => p.category === key).length;
          if (!count) return null;
          return <button key={key} onClick={() => { setCategory(key); setLimit(24); }} aria-pressed={category === key} className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-bold transition-colors ${category === key ? "bg-mavi text-ink-950" : "border border-white/10 text-muted hover:text-bone"}`}>{label}<span className={`ml-2 text-[10px] ${category === key ? "text-ink-800/70" : "text-muted/60"}`}>{count}</span></button>;
        })}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <span className="sr-only">Ürün ara</span><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setLimit(24); }} placeholder="Forma, atkı, antrenman…" className="w-full rounded-full border border-white/10 bg-ink-900 py-2.5 pl-10 pr-4 text-xs text-bone outline-none transition-colors placeholder:text-muted/65 focus:border-mavi/50" />
        </label>
        <button onClick={() => { setNewOnly((v) => !v); setLimit(24); }} aria-pressed={newOnly} className={`flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-bold ${newOnly ? "border-mavi/50 bg-mavi/10 text-mavi" : "border-white/10 text-muted hover:text-bone"}`}><Sparkles size={13} />Yeni Gelenler{catalog.newCount ? ` (${catalog.newCount})` : ""}</button>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted">
          <SlidersHorizontal size={13} />
          <span className="sr-only">Ürün sıralaması</span>
          <select value={sort} onChange={(e) => { setSort(e.target.value); setLimit(24); }} className="rounded-full border border-white/10 bg-ink-900 px-3 py-2.5 text-xs font-semibold text-bone outline-none focus:border-mavi/50">
            <option value="official">Mağaza sıralaması</option><option value="new">Yeniler önce</option><option value="price-asc">Fiyat: düşükten yükseğe</option><option value="price-desc">Fiyat: yüksekten düşüğe</option>
          </select>
        </label>
      </div>

      {filtered.length ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {filtered.slice(0, limit).map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
          {filtered.length > limit ? <div className="mt-8 flex justify-center"><button onClick={() => setLimit((n) => n + 24)} className="rounded-full border border-mavi/35 bg-mavi/10 px-7 py-3 text-xs font-bold text-mavi transition-colors hover:bg-mavi/20">Daha Fazla Ürün Göster ({filtered.length - limit})</button></div> : null}
        </>
      ) : (
        <div className="rounded-2xl border border-white/8 bg-ink-850 px-6 py-14 text-center">
          <p className="text-sm font-bold text-bone">{newOnly ? "Bu taramada yeni etiketli ürün bulunamadı." : "Aramana uygun ürün bulunamadı."}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">{newOnly ? "Sonraki yenilemelerde keşfedilen ürünler otomatik olarak bu alana eklenecek." : "Farklı bir kelime deneyebilir veya filtreleri temizleyebilirsin."}</p>
          <button onClick={() => { setNewOnly(false); setSearch(""); setCategory("all"); }} className="mt-4 text-xs font-bold text-mavi underline underline-offset-4">Tüm ürünleri göster</button>
        </div>
      )}

      <aside className="mt-10 rounded-2xl border border-white/8 bg-ink-900/60 p-5 text-xs leading-relaxed text-muted">
        <p className="mb-1 font-bold text-bone">Resmî kaynak, doğrudan alışveriş.</p>
        <p>Fiyatlar mağazada gösterilen KDV dâhil Türk lirası fiyatlarıdır. Son fiyat, beden seçenekleri ve stok bilgisi resmî mağazada geçerlidir. “Yeni” etiketi, mağazanın kendi işaretini veya ilk envanterden sonra son 14 günde vitrinde keşfedilen ürünü belirtir.</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">{catalog.sources.map((s) => <a key={s.category} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-mavi hover:text-mavi-200">{s.title}<ExternalLink size={11} /></a>)}</div>
        {catalog.warnings.length ? <details className="mt-4"><summary className="cursor-pointer font-semibold text-amber-300">Katalog hakkında ({catalog.warnings.length} not)</summary><ul className="mt-2 list-disc space-y-1 pl-4">{catalog.warnings.map((w) => <li key={w}>{w}</li>)}</ul></details> : null}
      </aside>
    </div>
  );
}
