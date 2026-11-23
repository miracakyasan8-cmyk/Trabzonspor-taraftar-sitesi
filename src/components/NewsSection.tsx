"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, ArrowLeftRight, Newspaper, Rss } from "lucide-react";
import type { NewsData, NewsItem } from "@/lib/types";
import { fmtDateFull, fmtTime, timeAgoTR } from "@/lib/format";
import { SectionHeading } from "./SectionHeading";
import { EmptyState, SectionError } from "./SectionState";

const PAGE = 15;

function Favicon({ item }: { item: NewsItem }) {
  const domain = item.sourceDomain;
  return domain ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      width={28}
      height={28}
      loading="lazy"
      className="h-7 w-7 shrink-0 rounded-md bg-white/90 p-0.5"
    />
  ) : (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-bordo to-bordo-600 font-display text-[11px] text-white">
      {item.source.slice(0, 1).toLocaleUpperCase("tr-TR")}
    </span>
  );
}

export function NewsSection({ news, error }: { news: NewsData | null; error?: string }) {
  const [cat, setCat] = useState<"all" | "transfer">("all");
  const [year, setYear] = useState("all");
  const [visible, setVisible] = useState(PAGE);

  // Yıl bazlı dinamik arşiv: 2026, 2027, 2028… (sistem otomatik üretir)
  const years = news?.years ?? [];

  const filtered = useMemo(
    () =>
      (news?.items ?? []).filter(
        (i) =>
          (cat === "all" || i.category === "transfer") &&
          (year === "all" || new Date(i.publishedAt).getUTCFullYear() === Number(year)),
      ),
    [news, cat, year],
  );

  const shown = filtered.slice(0, visible);
  const groups = useMemo(() => {
    const out: { day: string; items: NewsItem[] }[] = [];
    for (const it of shown) {
      const day = fmtDateFull(it.publishedAt);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(it);
      else out.push({ day, items: [it] });
    }
    return out;
  }, [shown]);

  return (
    <section id="haberler" className="relative scroll-mt-32 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          index="01"
          kicker="Google Haberler RSS"
          title="Haberler &amp;"
          accent="Transfer"
          description="Doğrudan Trabzonspor odaklı, doğrulanabilir haberler. Yıl filtresiyle arşivine geç; başlığa tıkladığında haber kaynağının sayfası açılır."
        />

        {!news ? (
          <SectionError title="Haber akışı alınamadı" message={error} />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {(
                [
                  { k: "all", label: "Tüm Haberler", icon: Newspaper },
                  { k: "transfer", label: "Transfer", icon: ArrowLeftRight },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.k}
                    onClick={() => {
                      setCat(t.k);
                      setVisible(PAGE);
                    }}
                    className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold transition-all ${
                      cat === t.k
                        ? "bg-gradient-to-r from-bordo to-bordo-400 text-white shadow-[0_8px_25px_-8px_rgba(138,21,56,0.8)]"
                        : "border border-white/10 bg-white/[0.03] text-muted hover:border-mavi/30 hover:text-bone"
                    }`}
                  >
                    <Icon size={15} />
                    {t.label}
                  </button>
                );
              })}

              <select
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  setVisible(PAGE);
                }}
                aria-label="Yıl filtresi"
                className="rounded-full border border-white/10 bg-ink-900 px-4 py-2.5 text-[13px] font-bold text-bone focus:border-mavi/50 focus:outline-none"
              >
                <option value="all">Tüm yıllar</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                <Rss size={11} className="text-mavi" />
                {filtered.length} haber • {news.provider}
              </span>
            </div>

            {news.failedWindows > 0 ? (
              <p className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/8 px-4 py-2.5 text-xs font-semibold text-amber-300">
                {news.failedWindows} dönem için kaynak yanıt vermedi; bazı eski haberler eksik olabilir.
                Verileri Yenile ile tekrar dene.
              </p>
            ) : null}

            {filtered.length === 0 ? (
              <EmptyState message="Bu filtreyle eşleşen haber bulunamadı." />
            ) : (
              <div className="space-y-8">
                {groups.map((g) => (
                  <div key={g.day}>
                    <h3
                      suppressHydrationWarning
                      className="mb-3 flex items-center gap-3 font-display text-sm uppercase tracking-[0.2em] text-mavi"
                    >
                      {g.day}
                      <span className="h-px flex-1 bg-white/8" />
                    </h3>
                    <ul className="grid gap-3 md:grid-cols-2">
                      {g.items.map((n) => (
                        <li key={n.id}>
                          <a
                            href={n.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="card-hover group flex h-full flex-col gap-3 rounded-2xl border border-white/8 bg-ink-850/90 p-4"
                          >
                            <div className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider">
                              <Favicon item={n} />
                              <span className="truncate text-mavi-200/90">{n.source}</span>
                              <span className="text-muted">•</span>
                              <span className="shrink-0 text-muted" suppressHydrationWarning>
                                {fmtTime(n.publishedAt)}
                              </span>
                              {n.category === "transfer" ? (
                                <span className="ml-auto shrink-0 rounded-full border border-mavi/40 bg-mavi/10 px-2 py-0.5 text-[9px] text-mavi">
                                  Transfer
                                </span>
                              ) : null}
                            </div>
                            <h4 className="text-[15px] font-bold leading-snug text-bone transition-colors group-hover:text-mavi-200">
                              {n.title}
                            </h4>
                            <span className="mt-auto flex items-center justify-between pt-1 text-[11px] font-bold uppercase tracking-[0.15em] text-mavi opacity-75 transition-opacity group-hover:opacity-100">
                              <span className="text-muted" suppressHydrationWarning>
                                {timeAgoTR(n.publishedAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                Habere git <ArrowUpRight size={13} />
                              </span>
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {visible < filtered.length ? (
                  <div className="flex justify-center">
                    <button
                      onClick={() => setVisible((v) => v + PAGE)}
                      className="rounded-full border border-mavi/40 bg-mavi/10 px-7 py-3 text-sm font-bold text-mavi transition-colors hover:bg-mavi/20"
                    >
                      Daha fazla haber ({filtered.length - visible} kaldı)
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
