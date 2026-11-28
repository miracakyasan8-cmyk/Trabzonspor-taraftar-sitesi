/** İstemci ve sunucu tarafından paylaşılan sabitler (yalnızca gerçek kaynak adresleri). */

export const TS_ID = "997"; // ESPN takım kimliği — Trabzonspor
export const TS_LOGO = "https://a.espncdn.com/i/teamlogos/soccer/500/997.png";

export const NEWS_SINCE_ISO = "2026-01-01T00:00:00+03:00";

export const SOCIAL = {
  instagram: { handle: "trabzonspor", url: "https://www.instagram.com/trabzonspor/" },
  tiktok: { handle: "trabzonspor", url: "https://www.tiktok.com/@trabzonspor" },
} as const;

const MK_TEAM = "2yab38jdfl0gk2tei1mq40o06"; // Maçkolik takım kimliği — Trabzonspor
export const MACKOLIK = {
  squad: `https://www.mackolik.com/takim/trabzonspor/kadro/${MK_TEAM}`,
  fixtures: `https://www.mackolik.com/takim/trabzonspor/ma%C3%A7lar/${MK_TEAM}`,
  live: "https://www.mackolik.com/canli-sonuclar",
  home: "https://www.mackolik.com/",
} as const;

/** Trabzonspor Kulübü resmî A Takım sayfası (kadro & fotoğraf kaynağı) */
export const OFFICIAL_SQUAD_URL = "https://www.trabzonspor.org.tr/tr/branslar/futbol/a-takimi-5";
