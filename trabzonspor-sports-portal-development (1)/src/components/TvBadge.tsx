import { Tv } from "lucide-react";
import type { Broadcast } from "@/lib/types";

/** Maçın yayınlanacağı TV kanalı. Doğrulanmışsa dolu rozet, yalnızca lig yayıncısı biliniyorsa soluk rozet. */
export function TvBadge({ tv, className = "" }: { tv: Broadcast | null | undefined; className?: string }) {
  if (!tv) return null;

  if (!tv.channel) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-muted ${className}`}
      >
        <Tv size={12} /> {tv.note ?? "Yayıncı açıklanmadı"}
      </span>
    );
  }

  return (
    <span
      title={tv.note ?? undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${
        tv.confirmed
          ? "border-mavi/40 bg-mavi/12 text-mavi-200"
          : "border-white/12 bg-white/[0.04] text-bone/80"
      } ${className}`}
    >
      <Tv size={12} className={tv.confirmed ? "text-mavi" : "text-muted"} />
      {tv.channel}
      {!tv.confirmed ? (
        <span className="hidden font-semibold text-muted sm:inline">• kanal no yakında</span>
      ) : null}
    </span>
  );
}
