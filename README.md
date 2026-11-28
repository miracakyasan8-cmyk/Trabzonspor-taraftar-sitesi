# FIRTINA61

Next.js App Router, PostgreSQL/Drizzle ve koyu bordo-mavi tasarımlı Trabzonspor taraftar portalı.

## Sayfalar

| Adres | İçerik |
| --- | --- |
| `/` | Tek ekranlık karşılama başlığı, sekme bağlantıları, sıradaki maç / canlı skor ve geri sayım. Alt akış veya footer yoktur. |
| `/haberler` | 1 Ocak 2026 sonrası Haberler & Transfer akışı. |
| `/oynanmis` | Oynanmış maçlar ve maç detayları. |
| `/oynanacak` | Gelecek fikstür ve yayıncı bilgileri. |
| `/puan-durumu` | Süper Lig tam puan tablosu. |
| `/kadro` | Resmî kulüpten fotoğraflı A Takım kadrosu (mevkilere göre gruplu), mini profil modalı. Saha dizilişi yoktur. |
| `/sosyal` | Resmî sosyal medya hesapları. |
| `/ts-store` | Resmî mağazadan canlı ürün kataloğu. |

## TS Store entegrasyonu

Kaynak **https://trabzonspor.com.tr/** (resmî TS Club alışveriş sitesi).

- Sezon formaları ve son koleksiyon mağazanın canlı menüsünden keşfedilir; sezon/yıl sabitlenmez.
- Formalar, antrenman ürünleri, son koleksiyon ve aksesuarlar taranır. Mağazanın halka açık HTML ürün kartları Cheerio ile okunur; gizli API veya erişim engeli aşma kullanılmaz.
- Mağazanın kendi `currency=try` seçeneği ile KDV dâhil Türk lirası fiyatları alınır. Dövizden tahminî dönüşüm yapılmaz.
- Fiyatı, ürün kimliği veya resmî görseli doğrulanamayan kartlar yayımlanmaz. Katalog erişilemezse sahte ürün veya eski fiyat yerine hata durumu ve doğrudan resmî mağaza bağlantısı gösterilir.
- Katalog taraması her kategori için en fazla 16 sayfa ve aynı anda en fazla 4 istek ile sınırlıdır. Eksik taramalar arayüzde açıkça belirtilir.
- Kartlardaki **İncele / Satın Al** butonları gerçek ürün sayfasını yeni sekmede açar. Ödeme, stok ve beden seçimi yalnızca resmî mağazada yapılır.
- Kategori, arama, fiyat sıralaması, yeni ürün ve daha fazla ürün yükleme kontrolleri çalışır.

### Kalıcı “Yeni” takibi

PostgreSQL'de yalnızca ürün kimlikleri ve gözlem tarihleri saklanır (`store_product_observations`, `store_sync_state`). **Fiyat veya görseller veritabanında tutulmaz.**

İlk başarılı tarama bir başlangıç envanteridir; var olan tüm ürünlere yanlışlıkla “Yeni” etiketi verilmez. Sonraki taramalarda keşfedilen kimlikler 14 gün boyunca “Yeni” olarak görünür. Ayrıca mağazanın kendi yeni-ürün etiketi korunur. Etiket, ürünün ilk üretim/lansman tarihini değil, mağaza işaretini veya vitrinde yeni keşfedilmesini belirtir.

## Resmî kulüp kadrosu ve transfer takibi

- Kadro, **Trabzonspor Kulübü'nün resmî A Takım sayfasından** (`trabzonspor.org.tr`) okunur. Sayfa Cloudflare korumalı olduğu için sunucu, okunabilir markdown proxy üzerinden resmî HTML içeriğini alır; oyuncu adları, forma numaraları, mevkiler ve **yüksek çözünürlüklü profil fotoğrafları doğrudan kulübün CDN'inden** gelir.
- ESPN yalnızca forma numarası güvenli eşleştirmesiyle uyruk/yaş ve Trabzonspor formasıyla oynanan resmî maç istatistiklerini sağlar. Kulüp listesinde olmayan genç oyuncu kayıtları gösterilmez.
- Kalıcı `squad_observations` tablosu yalnızca resmî kimlikleri tutar; fotoğraf veya istatistik saklanmaz. İlk tarama başlangıç envanteridir. Kulüp sitesine yeni eklenen oyuncu otomatik listeye gelir ve 14 gün **"Yeni Transfer"** etiketlenir; siteden çıkan oyuncu listeden düşer.
- Oyuncu modalında yalnızca Trabzonspor istatistikleri (maç, ilk 11, dakika, gol, asist, sarı/kırmızı kart), resmî kulüp profili ve doğrulanmış Transfermarkt bağlantısı vardır.

## Oynanmış maçlar: resmî kadro ve fotoğraflı saha

- Kadro, olaylar ve diziliş yalnızca maçın resmî kimliğinden (ESPN event/fixture ID) alınır. İlk 11 kaynaktaki sırasıyla korunur; forma numarasına göre yeniden sıralanmaz.
- Saha yerleşimi ESPN pozisyon kısaltmalarına göre değil, resmî **diziliş slotlarına** (`formationPlace`) göre yapılır. 4-3-3, 4-1-4-1 ve 4-2-3-1 için koordinatlar gerçek maç verisiyle doğrulandı; diğer dizilişlerde formasyon dizesinden satır kuran güvenli yedek yöntem devreye girer (`src/lib/formation.ts`).
- Trabzonspor oyuncuları aynı oyuncu kimliğiyle resmî kulüp kadrosuna bağlanır: kutucukta güncel resmî fotoğraf, forma numarası, ad, gol/kart işareti ve maç reytingi görünür.
- Reyting, maçın resmî istatistiklerinden şeffaf bir formülle **hesaplanır**. Maçkolik'in kendi puanı değildir (Maçkolik sunucu taramasına izin vermez).
- Tüm maç olayları Türkçedir: Gol, Kafa Golü, Penaltı Golü, Kaçan/Kurtarılan Penaltı, Sarı/Kırmızı Kart, Oyuncu Değişikliği, Başlama Vuruşu, Devre Arası vb. Bilinmeyen yeni bir olay türü İngilizce değil "Maç Olayı" olarak gösterilir.
- Oynanacak maçlarda maça 48 saatten az kalınca resmî kadro kontrol edilir; açıklandıysa "Resmî Kadro Açıklandı" rozeti ve fotoğraflı ilk 11 önizlemesi çıkar.

## Turnuvalar

ESPN'deki Süper Lig, Şampiyonlar Ligi, Avrupa Ligi, Konferans Ligi ve üç eleme turu taranır. Trabzonspor'un fikstüründe maçı olan kulvarın tablosu otomatik eklenir. Ziraat Türkiye Kupası maçları TheSportsDB takım akışından alınır; kupa eleme usulü olduğu için tablosu yoktur.

## Sezonluk resmî fotoğraflar

Kulüp yeni (ör. sezonluk) profil fotoğrafı yüklediğinde CDN adresi değişir. `squad_observations.photo_url` bunu algılar, `photo_updated_at` yenilenir ve tüm profillerde yeni fotoğraf otomatik kullanılır.

## Canlı Maç Modu ve Maç Penceresi

- Ana sayfadaki maç kartı maç başladığında 15 sn yoklamayla CANLI moda geçer: kırmızı yanıp sönen rozet, anlık skor, dakika ve Türkçe faz (İlk Yarı / Devre Arası / İkinci Yarı / Uzatma).
- Karta tıklanınca tek maç penceresi açılır: skor + yayıncı kanal, Trabzonspor'un sahadaki 11'i (resmî kulüp fotoğrafı, forma no, ad, maç reytingi) ve Türkçe olay akışı. Canlı maçta 15 sn'de bir yenilenir.
- Rakip takım oyuncuları için profil kartı veya fotoğraf gösterilmez. Liste görünümleri kaldırılmıştır; detay yalnızca saha üzerinde ve olay akışındadır.
- Maç bitince pencere maç sonu özetini gösterir; maç canlıdan çıktığında son bilinen hali arşive (`finished.ts`) alınır ve Oynanmış Maçlar sekmesine ESPN gecikmesi olmadan işlenir.

## Akıllı veri kurtarma (retry & fallback)

- Her dış istek `src/lib/http.ts` üzerinden **3 deneme** ile yapılır: üstel bekleme (0,4 s → 1,2 s → 3,6 s, rastgele sapmalı). Zaman aşımı, ağ hatası, 429 ve 5xx yeniden denenir; 4xx kalıcı hata sayılır.
- `src/lib/cache.ts` her kaynağın **son başarılı verisini** ayrı tutar. Yenileme önbelleği boşaltsa bile kaynak 3 denemeden sonra yanıt vermezse boş/hatalı ekran yerine son başarılı veri sunulur ve "eski veri" olarak işaretlenir (varsayılan en fazla 7 gün, mağaza için 24 saat).
- Resmî kadro için ek **kalıcı katman**: her başarılı okuma `squad_snapshots` tablosuna yazılır; süreç yeniden başlasa bile kurtarma mümkündür. Türkçe sayfa engellenirse İngilizce kadro sekmesi ikinci kaynak olarak denenir. Eski görüntüyle yeni transfer/ayrılış kararı verilmez.
- Arayüz: üst çubuğun altında "Canlı veriler güncelleniyor; … için son başarılı veriler gösteriliyor" bandı çıkar ve **90 sn'de bir** arka planda otomatik yeniden dener; Kaynak raporu her kaynağı canlı / eski veri / başarısız olarak gösterir. Manuel yenileme ve 00:00 döngüsü asla yarıda kalmaz (`staleCount` ile raporlanır).
- Doğrulandı: ESPN ve kulüp okuyucusu DNS düzeyinde kesildiğinde 7 kaynaktan 3'ü "eski veri" ile tam içerikle sunuldu, 4'ü canlı kaldı; ağ dönünce ilk yenilemede 7/7 canlıya geçti.

## Oyuncu detayları, yaş ve piyasa değeri

- Doğum tarihi resmî kulüp kadrosundan gelir; **yaş her yenilemede bu tarihten hesaplanır** (doğum günü geçmişse otomatik artar).
- Boy, ayak, kulübe katılış, sözleşme bitişi ve **piyasa değeri** trabzon.org "Detaylı Kadro" sayfasından (Transfermarkt verisi) okunur; eşleştirme forma numarası + ad uyumuyla yapılır, değer bulunamayan oyuncuda alan boş bırakılır (uydurulmaz).

## Dinamik lig / turnuva takibi

- Kulvarlar yalnızca **güncel dönemin** (±120 gün) maçlarından belirlenir; elenilen/biten eski turnuvalar listeden düşer.
- Ulusal lig, Trabzonspor'un fiilen maç yaptığı ligdir (Süper Lig ↔ TFF 1. Lig geçişinde eski tablo kaldırılır).
- Avrupa kupalarında Trabzonspor artık tabloda yoksa o turnuva gösterilmez; yeni turnuvaya geçişte yeni tablo ve rakipler otomatik gelir.

## Senkronizasyon

- Üstteki **Verileri Yenile**: `POST /api/refresh` önbelleği temizler; maçlar, puan durumu, kadro, haberler, sosyal medya ve **TS Store** eşzamanlı yeniden alınır. Çubuk altı kaynağın durumunu raporlar.
- Üst çubuktaki **Kaynak raporu** paneli son yenilemede taranan her kaynağı, durumunu ve özetini gösterir (`GET /api/meta`).
- `GET /api/store`: katalog, kaynak adresleri, son kontrol saati, tarama notları ve yeni-ürün durumu.
- Katalog normal okumada 5 dakika önbelleklidir; manuel/cron yenilemesi bu süreyi beklemez. Süresi dolmuş fiyatlar mağaza hatasında güncel gibi sunulmaz.
- `src/instrumentation.ts` uzun yaşayan Node sunucusunda tam **00:00 Europe/Istanbul** için zamanlayıcı kurar.
- Uykuya giren/serverless dağıtımlarda harici zamanlayıcı **21:00 UTC (= 00:00 TSİ)** için `POST /api/cron/nightly` çağırmalıdır; varsa `Authorization: Bearer <CRON_SECRET>` başlığı gönderilir. Uzun yaşayan sunucu zamanlayıcısını kapatmak için `NIGHTLY_REFRESH_DISABLED=1`.

## Kurulum

1. `npm install`
2. `.env.example` örneğindeki `DATABASE_URL` değerini yerel PostgreSQL'e göre ayarlayın.
3. Veritabanı hazır olduğunda `npx drizzle-kit push` ile gözlem tablolarını oluşturun.
4. `npm run build` ve `npm start`.

Platform önizlemesinde veritabanı ve uygulama başlatma platform tarafından yönetilir. TS Store için API anahtarı gerekmez. Yeni-ürün kayıtları sunucu yeniden başladığında korunur.

Opsiyonel servis değişkenleri `.env.example` içindedir: rss2json, Instagram Graph API, cron anahtarı. Sosyal platformların erişim kısıtlarında resmî embed bileşenleri kullanılır. Kaynak eksikleri arayüzde gizlenmez.

## Doğrulama

`npx next typegen`, `npm exec tsc -- --noEmit --pretty false`, `npm run build`.
