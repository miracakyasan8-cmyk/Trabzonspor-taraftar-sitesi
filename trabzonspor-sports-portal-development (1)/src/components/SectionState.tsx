import { AlertTriangle, Inbox } from "lucide-react";

/** Kaynak yanıt vermediğinde gösterilen dürüst hata durumu — asla sahte içerik gösterilmez. */
export function SectionError({ title, message }: { title: string; message?: string }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-bordo/40 bg-bordo/10 p-5 sm:p-6">
      <AlertTriangle className="mt-0.5 shrink-0 text-bordo-300" size={20} />
      <div>
        <p className="text-sm font-bold text-bone">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {message ? `${message} — ` : ""}
          Canlı kaynağa şu an ulaşılamıyor. Üstteki <b className="text-mavi-200">Verileri Yenile</b>{" "}
          düğmesiyle tekrar deneyebilirsin.
        </p>
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-ink-850/70 p-10 text-center">
      <Inbox size={22} className="text-muted" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
