import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Yalnızca resmî mağazadan keşfedilen ürünlerin gözlem kaydı.
 * Fiyat ve görsel saklanmaz: katalog her zaman doğrudan mağazadan okunur.
 * İlk tarama bir başlangıç envanteridir; sonraki taramalarda görülen yeni kimlikler
 * 14 gün boyunca "Yeni" olarak işaretlenir. Bu tarih ürünün lansman tarihi değildir.
 */
export const storeProductObservations = pgTable("store_product_observations", {
  productId: text("product_id").primaryKey(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  newUntil: timestamp("new_until", { withTimezone: true }),
});

/**
 * Resmî kulüp sitesinde görülen A Takım oyuncularının kalıcı gözlemi.
 * Fotoğraf/istatistik saklanmaz; yalnızca yeni transfer ve ayrılış tespiti için kullanılır.
 */
export const squadObservations = pgTable("squad_observations", {
  officialId: text("official_id").primaryKey(),
  firstName: text("first_name").notNull(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  seenCount: integer("seen_count").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  newUntil: timestamp("new_until", { withTimezone: true }),
  /** Kulübün yayımladığı son profil fotoğrafı adresi — sezon fotoğrafı değişimini algılamak için */
  photoUrl: text("photo_url"),
  photoUpdatedAt: timestamp("photo_updated_at", { withTimezone: true }),
});

/**
 * Resmî yönetim organındaki başkan ve teknik direktörün gözlemi.
 * İsim/fotoğraf değişimini algılamak için tutulur; değer saklanmaz (sadece tespit).
 */
export const leadershipObservations = pgTable("leadership_observations", {
  role: text("role").primaryKey(), // "president" | "coach"
  name: text("name").notNull(),
  photo: text("photo"),
  officialId: text("official_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  previousName: text("previous_name"),
});

export const storeSyncState = pgTable("store_sync_state", {
  id: text("id").primaryKey(),
  initializedAt: timestamp("initialized_at", { withTimezone: true }).defaultNow().notNull(),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Son BAŞARILI resmî kadro okumasının tam anlık görüntüsü (kurtarma katmanı).
 * Kulüp sitesi/okuyucu servisi yanıt vermediğinde süreç yeniden başlasa bile boş ekran
 * yerine bu görüntü "son başarılı veri" uyarısıyla sunulur. Uydurma değil, gerçek son veridir.
 */
export const squadSnapshots = pgTable("squad_snapshots", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
});
