import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { FixturesData } from "@/lib/types";
import { LiveHomeCard } from "./LiveHomeCard";

export function Hero({ fixtures, error }: { fixtures: FixturesData | null; error?: string }) {
  const live = fixtures?.live ?? null;
  const next = fixtures?.next[0] ?? null;
  return (
    <section aria-labelledby="welcome-title" className="home-hero relative isolate">
      <Image src="/images/hero-storm.jpg" alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950/95 via-ink-950/70 to-ink-950/65" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/20" />
      <div className="pointer-events-none absolute -left-40 top-0 -z-10 h-[450px] w-[450px] rounded-full bg-bordo/20 blur-[140px]" />
      <div className="home-hero-grid mx-auto grid w-full max-w-7xl items-center">
        <div className="home-welcome">
          <div className="home-kicker inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-mavi-200">
            <span className="h-1.5 w-1.5 rounded-full bg-mavi" />Bize her yer Trabzon
          </div>
          <h1 id="welcome-title" className="font-display uppercase tracking-tight">
            <span className="home-title block text-bone">Bordo Mavi</span>
            <span className="home-title-accent gradient-text block italic">Fırtına</span>
          </h1>
          <p className="home-intro max-w-md text-sm leading-relaxed text-muted">
            Aynı armanın etrafında, aynı heyecanla.<br className="hidden lg:block" /> Bordo-mavi dünyana hoş geldin.
          </p>
          <div className="home-actions flex flex-wrap gap-2.5">
            <Link href="/oynanacak" className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-bordo to-bordo-400 font-bold text-white shadow-[0_10px_30px_-10px_rgba(138,21,56,0.8)] transition-transform hover:scale-[1.03]">
              Maçları Keşfet<ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <Link href="/haberler" className="inline-flex items-center rounded-full border border-mavi/35 bg-mavi/10 font-bold text-mavi transition-colors hover:bg-mavi/20">
              Haberler & Transfer
            </Link>
          </div>
        </div>
        {live || next || !error ? (
          <LiveHomeCard initialLive={live} initialNext={next} />
        ) : (
          <div className="glass home-match-card rounded-3xl text-center">
            <p className="font-display text-lg uppercase tracking-wider text-mavi">Sıradaki Maç</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">{error}</p>
            <p className="mt-2 text-xs text-muted">Üstteki Verileri Yenile düğmesiyle tekrar deneyebilirsin.</p>
          </div>
        )}
      </div>
    </section>
  );
}
