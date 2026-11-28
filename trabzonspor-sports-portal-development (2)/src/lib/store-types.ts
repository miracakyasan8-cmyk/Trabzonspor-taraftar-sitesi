export type StoreCategory = "forma" | "antrenman" | "koleksiyon" | "aksesuar";

export interface StoreProduct {
  id: string;
  name: string;
  url: string;
  image: string;
  price: number;
  previousPrice: number | null;
  currency: "TRY";
  category: StoreCategory;
  sourceNew: boolean;
  isNew: boolean;
  newUntil: string | null;
  available: boolean;
}

export interface StoreSource {
  category: StoreCategory;
  title: string;
  url: string;
  count: number;
  pagesFetched: number;
  complete: boolean;
}

export interface StoreData {
  products: StoreProduct[];
  checkedAt: string;
  source: "TS Club • Resmî mağaza";
  sourceUrl: string;
  season: string | null;
  collection: string | null;
  sources: StoreSource[];
  warnings: string[];
  newCount: number;
  newTracking: boolean;
}

export const STORE_URL = "https://trabzonspor.com.tr/";

export const STORE_CATEGORIES: Record<StoreCategory, string> = {
  forma: "Yeni sezon formaları",
  antrenman: "Antrenman",
  koleksiyon: "Son koleksiyon",
  aksesuar: "Aksesuarlar",
};
