import { TS_LOGO } from "@/lib/constants";
import { TeamLogo } from "./TeamLogo";

const SOURCES = [
  ["ESPN", "Puan durumu, fikstür, canlı skor, kadro, maç kadrosu ve resmî kulüp armaları"],
  ["Google Haberler RSS", "Haber ve transfer akışı (rss2json / sunucu proxy)"],
  ["Wikipedia", "Teknik direktör bilgisi"],
  ["Instagram & TikTok", "Resmî @trabzonspor hesapları"],
  ["Maçkolik", "Maç günü kadro ve maç merkezi bağlantıları"],
  ["TS Club", "Resmî ürün kataloğu, görseller ve Türk lirası fiyatları"],
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/8 bg-ink-900">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[700px] -translate-x-1/2 rounded-full bg-bordo/15 blur-[120px]" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-sm">
            <div className="mb-4 flex items-center gap-3">
              <TeamLogo src={TS_LOGO} name="Trabzonspor" size={48} />
              <span className="font-display text-2xl tracking-wide text-bone">
                FIRTINA<span className="text-mavi">61</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted">
              Bu site bir taraftar projesidir; Trabzonspor Kulübü&apos;nün resmî sitesi değildir. Kulüp adları,
              armaları ve içerikler ilgili hak sahiplerine aittir.
            </p>
          </div>

          <div>
            <span className="mb-3 block font-display text-xs uppercase tracking-[0.25em] text-mavi">
              Veri Kaynakları
            </span>
            <ul className="flex flex-col gap-2 text-xs text-muted">
              {SOURCES.map(([name, desc]) => (
                <li key={name}>
                  <b className="text-bone">{name}</b> — {desc}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-[11px] font-semibold uppercase tracking-wider text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} FIRTINA61 — Taraftar Portalı</span>
          <span>Tüm veriler canlı kaynaklardan çekilir</span>
        </div>
      </div>
    </footer>
  );
}
