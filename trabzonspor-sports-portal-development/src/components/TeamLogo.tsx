"use client";

import { useState } from "react";

/**
 * Resmî kulüp arması (ESPN CDN, 500px PNG).
 * Görsel yüklenemezse (nadir) yer tutucu ikon değil, takımın kısaltması gösterilir.
 */
export function TeamLogo({
  src,
  name,
  size = 40,
  className = "",
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        role="img"
        aria-label={name}
        className={`inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-ink-700 font-display text-bone/80 ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(8, size * 0.3) }}
      >
        {name.replace(/[^\p{L}]/gu, "").slice(0, 3).toLocaleUpperCase("tr-TR")}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${name} arması`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`shrink-0 object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.55)] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
