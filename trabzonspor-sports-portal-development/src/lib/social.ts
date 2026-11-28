import { cached } from "./cache";
import { fetchJson, fetchText } from "./http";
import { SOCIAL } from "./constants";
import type { SocialData, SocialPost, SocialProfile } from "./types";

/**
 * Resmi sosyal medya hesapları (@trabzonspor).
 *
 * TikTok: profil sayfasındaki sunucu verisi okunur (profil, takipçi, beğeni ve — varsa — son videolar).
 * Instagram: INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ID tanımlıysa resmi Graph API
 * (Business Discovery) ile son gönderiler çekilir.
 *
 * İki platform da anahtarsız herkese açık bir "son gönderiler" akışı sunmadığından, gönderi listesi
 * alınamazsa arayüz platformların resmi gömme (embed) bileşenlerine geçer — içerik her durumda canlıdır.
 */

function empty(platform: "instagram" | "tiktok"): SocialProfile {
  return {
    platform,
    handle: SOCIAL[platform].handle,
    url: SOCIAL[platform].url,
    name: null,
    avatar: null,
    followers: null,
    likes: null,
    mediaCount: null,
    items: [],
    via: "embed",
    error: null,
  };
}

/* ---------------------------- TikTok ---------------------------- */

interface TikTokItem {
  id: string;
  desc?: string;
  createTime?: number | string;
  video?: { cover?: string; originCover?: string; dynamicCover?: string };
}
interface TikTokDetail {
  userInfo?: {
    user?: { nickname?: string; avatarLarger?: string };
    stats?: { followerCount?: number; heartCount?: number; videoCount?: number };
    statsV2?: { followerCount?: string; heartCount?: string; videoCount?: string };
    itemList?: TikTokItem[];
  };
}

async function loadTikTok(): Promise<SocialProfile> {
  const base = empty("tiktok");
  try {
    const html = await fetchText(SOCIAL.tiktok.url, { timeoutMs: 12_000 });
    const m = html.match(
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (!m) throw new Error("TikTok profil verisi bulunamadı");
    const json = JSON.parse(m[1]) as {
      __DEFAULT_SCOPE__?: { "webapp.user-detail"?: TikTokDetail };
    };
    const info = json.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo;
    if (!info?.user) throw new Error("TikTok profili okunamadı");

    const num = (a?: string | number, b?: number) => {
      const n = a != null ? Number(a) : b;
      return n != null && Number.isFinite(n) ? n : null;
    };

    const items: SocialPost[] = (info.itemList ?? []).slice(0, 12).map((it) => ({
      id: it.id,
      url: `${SOCIAL.tiktok.url}/video/${it.id}`,
      thumbnail: it.video?.originCover ?? it.video?.cover ?? it.video?.dynamicCover ?? null,
      caption: it.desc ?? "",
      timestamp: it.createTime ? new Date(Number(it.createTime) * 1000).toISOString() : null,
      kind: "video",
    }));

    return {
      ...base,
      name: info.user.nickname ?? null,
      avatar: info.user.avatarLarger ?? null,
      followers: num(info.statsV2?.followerCount, info.stats?.followerCount),
      likes: num(info.statsV2?.heartCount, info.stats?.heartCount),
      mediaCount: num(info.statsV2?.videoCount, info.stats?.videoCount),
      items,
      via: items.length ? "api" : "embed",
    };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : "TikTok verisi alınamadı" };
  }
}

/* --------------------------- Instagram -------------------------- */

interface IgMedia {
  id: string;
  caption?: string;
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp?: string;
}

async function loadInstagram(): Promise<SocialProfile> {
  const base = empty("instagram");
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const bizId = process.env.INSTAGRAM_BUSINESS_ID;
  if (!token || !bizId) return base; // anahtar yok → resmi embed

  try {
    const fields = `business_discovery.username(${SOCIAL.instagram.handle}){username,name,profile_picture_url,followers_count,media_count,media.limit(12){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp}}`;
    const d = await fetchJson<{
      business_discovery?: {
        name?: string;
        profile_picture_url?: string;
        followers_count?: number;
        media_count?: number;
        media?: { data?: IgMedia[] };
      };
    }>(
      `https://graph.facebook.com/v21.0/${bizId}?fields=${encodeURIComponent(fields)}&access_token=${token}`,
      { timeoutMs: 12_000 },
    );
    const bd = d.business_discovery;
    if (!bd) throw new Error("Instagram yanıtı boş");

    const items: SocialPost[] = (bd.media?.data ?? []).map((x) => ({
      id: x.id,
      url: x.permalink,
      thumbnail: x.thumbnail_url ?? x.media_url ?? null,
      caption: x.caption ?? "",
      timestamp: x.timestamp ?? null,
      kind: x.media_type === "VIDEO" ? "video" : x.media_type === "CAROUSEL_ALBUM" ? "carousel" : "image",
    }));
    return {
      ...base,
      name: bd.name ?? null,
      avatar: bd.profile_picture_url ?? null,
      followers: bd.followers_count ?? null,
      mediaCount: bd.media_count ?? null,
      items,
      via: items.length ? "api" : "embed",
    };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : "Instagram verisi alınamadı" };
  }
}

export async function getSocial(): Promise<SocialData> {
  return cached("social", 20 * 60_000, async () => {
    const [instagram, tiktok] = await Promise.all([loadInstagram(), loadTikTok()]);
    return { instagram, tiktok };
  });
}
