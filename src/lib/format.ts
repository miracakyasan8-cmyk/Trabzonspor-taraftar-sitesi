/** Tüm tarih/saatler Türkiye saatiyle (TSİ) gösterilir — sunucu ve tarayıcıda aynı çıktı. */
const TZ = "Europe/Istanbul";

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

export const fmtTimeSec = (iso: string) =>
  new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: TZ,
  });

export const fmtDateLong = (iso: string) =>
  new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
    timeZone: TZ,
  });

export const fmtDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", timeZone: TZ });

export const fmtDateFull = (iso: string) =>
  new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });

/** "2026-11" gibi ay anahtarı (TSİ) */
export const monthKey = (iso: string) =>
  new Date(iso)
    .toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", timeZone: TZ })
    .slice(0, 7);

export const monthLabel = (key: string) =>
  new Date(`${key}-15T12:00:00Z`).toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });

export function timeAgoTR(iso: string, now = Date.now()) {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;
  return fmtDateShort(iso);
}

export function compactNumber(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
