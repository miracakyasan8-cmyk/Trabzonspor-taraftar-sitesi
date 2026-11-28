"use client";

import { useEffect } from "react";
import { ExternalLink, Heart, Play, Users, Video } from "lucide-react";
import { SOCIAL } from "@/lib/constants";
import { compactNumber, fmtDateShort } from "@/lib/format";
import type { SocialData, SocialPost, SocialProfile } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";
import { SectionError } from "./SectionState";
import { Reveal } from "./Reveal";

function TikTokEmbed() {
  useEffect(() => {
    document.querySelector('script[src="https://www.tiktok.com/embed.js"]')?.remove();
    const s = document.createElement("script");
    s.src = "https://www.tiktok.com/embed.js";
    s.async = true;
    document.body.appendChild(s);
    return () => s.remove();
  }, []);

  return (
    <div suppressHydrationWarning className="flex justify-center">
      <blockquote
        className="tiktok-embed"
        cite={SOCIAL.tiktok.url}
        data-unique-id={SOCIAL.tiktok.handle}
        data-embed-type="creator"
        style={{ maxWidth: 780, minWidth: 288, width: "100%" }}
      >
        <section>
          <a target="_blank" rel="noopener noreferrer" href={`${SOCIAL.tiktok.url}?refer=creator_embed`}>
            @{SOCIAL.tiktok.handle}
          </a>
        </section>
      </blockquote>
    </div>
  );
}

function InstagramEmbed() {
  return (
    <iframe
      src={`${SOCIAL.instagram.url}embed`}
      title="Trabzonspor resmî Instagram hesabı"
      loading="lazy"
      className="h-[640px] w-full rounded-xl border border-white/10 bg-white"
    />
  );
}

function Gallery({ items, tall }: { items: SocialPost[]; tall: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((p) => (
        <li key={p.id}>
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`card-hover group relative block overflow-hidden rounded-2xl border border-white/10 bg-ink-800 ${
              tall ? "aspect-[9/14]" : "aspect-square"
            }`}
          >
            {p.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.thumbnail}
                alt={p.caption.slice(0, 80) || "Gönderi"}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : null}
            <span className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-transparent" />
            {p.kind === "video" ? (
              <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink-950/70 backdrop-blur">
                <Play size={14} className="text-white" fill="currentColor" />
              </span>
            ) : null}
            <span className="absolute inset-x-0 bottom-0 p-3">
              <span className="line-clamp-2 text-[11px] font-semibold leading-snug text-bone">{p.caption}</span>
              {p.timestamp ? (
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-mavi-200" suppressHydrationWarning>
                  {fmtDateShort(p.timestamp)}
                </span>
              ) : null}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function ProfileCard({ profile }: { profile: SocialProfile }) {
  const isTikTok = profile.platform === "tiktok";
  const label = isTikTok ? "TikTok" : "Instagram";

  return (
    <div className="glass flex flex-col overflow-hidden rounded-3xl">
      <div className="flex flex-wrap items-center gap-4 border-b border-white/8 p-5">
        {profile.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar}
            alt={`${label} profil fotoğrafı`}
            width={56}
            height={56}
            referrerPolicy="no-referrer"
            className="h-14 w-14 shrink-0 rounded-full border-2 border-mavi/40 object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-ink-700 font-display text-sm text-bone/80">
            {label.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-mavi">{label}</p>
          <p className="truncate font-display text-xl uppercase text-bone">{profile.name ?? "Trabzonspor"}</p>
          <p className="text-xs font-semibold text-muted">@{profile.handle}</p>
        </div>
        <a
          href={profile.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-bordo to-bordo-400 px-4 py-2 text-xs font-bold text-white transition-transform hover:scale-[1.04]"
        >
          Profili Aç <ExternalLink size={12} />
        </a>
      </div>

      {profile.followers != null || profile.likes != null || profile.mediaCount != null ? (
        <div className="grid grid-cols-3 divide-x divide-white/8 border-b border-white/8 text-center">
          {[
            { icon: Users, v: profile.followers, l: "Takipçi" },
            { icon: Heart, v: profile.likes, l: "Beğeni" },
            { icon: Video, v: profile.mediaCount, l: isTikTok ? "Video" : "Gönderi" },
          ].map((s) => (
            <div key={s.l} className="px-2 py-3">
              <p className="font-display text-xl text-bone">{compactNumber(s.v)}</p>
              <p className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                <s.icon size={10} /> {s.l}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex-1 p-4 sm:p-5">
        {profile.items.length ? (
          <Gallery items={profile.items} tall={isTikTok} />
        ) : isTikTok ? (
          <TikTokEmbed />
        ) : (
          <InstagramEmbed />
        )}
        {profile.error ? (
          <p className="mt-3 text-[11px] font-semibold text-muted">
            Sunucu akışı alınamadı ({profile.error}); resmî gömme bileşeni gösteriliyor.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function SocialSection({ social, error }: { social: SocialData | null; error?: string }) {
  return (
    <section id="sosyal" className="relative scroll-mt-32 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          index="06"
          kicker="Resmî Hesaplar"
          title="Sosyal"
          accent="Medya Akışı"
          description="Trabzonspor'un resmî Instagram ve TikTok hesaplarından en yeni video ve gönderiler. Sunucu akışı varsa galeri, yoksa platformların resmî gömme bileşeni gösterilir."
        />
        {!social ? (
          <SectionError title="Sosyal medya verisi alınamadı" message={error} />
        ) : (
          <Reveal>
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <ProfileCard profile={social.instagram} />
              <ProfileCard profile={social.tiktok} />
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
