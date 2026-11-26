# ui5-smart-access — Tasarım önerileri (26.11.2026)

Kaynak: `package/` 1.3.0 (Popover + Flyout fragment'ları, 13 panel, `css/style.css`),
test uygulaması `test/` lokal çalıştırıldı (127.0.0.1, Horizon, 1536 px @ %80 ve 390 px telefon).
Mevcut durum görüntüleri: `design/mevcut/`, öneri mockup'ları: `design/mockups.html` +
`design/mockup-*.png`.

## 1. Tespitler (bileşen bileşen)

### Ana popover (Popover.fragment.xml)
1. **Satır tıklamasının ne yapacağı tahmin edilemiyor.** 11 satırın 4'ü anında aç/kapa
   (Gece, Linkler, Animasyon, Resim), 4'ü satır içinde açılıyor (Yazı, Okuma yardımı, İmleç,
   Mavi ışık), 2'si yan flyout açıyor (TTS, Kontrast), Renk körlüğü ise hem filtreyi
   **hemen %100 Protanomaly ile uyguluyor** hem satır içi açılıyor. Kullanıcı sadece
   bakmak isterken sayfanın renkleri değişiyor.
2. **Durum görünmüyor.** Aktiflik yalnız açık mavi satır zemini; değer (125 %, 1,2×,
   "Rehber çizgi") ana listede yazmıyor. Kaç özelliğin açık olduğu launcher'da da yok.
3. **Fiil etiketleri:** "Activate Blue Filter" → "Deactivate Blue Filter", "Hide Images".
   Etiket durum değiştikçe değişiyor; ekran okuyucu ve göz için switch + sabit isim daha net.
4. **Gruplama yok.** 11 düz satır; Görme / Okuma / Hareket ayrımı taramayı hızlandırır.
5. **Satır içi açılan paneller birikiyor** → popover yüksekliği ekranı dolduruyor,
   "Reset All" aşağı itiliyor (bkz. `mevcut/04`).
6. **Yazı boyutu "0" gösteriyor** (`typoFontPct`). Kullanıcı için anlamsız; "100 %" /
   "Standart" olmalı.

### Yan flyout (Flyout.fragment.xml)
7. **İpucu balonu (hoverHints) flyout başlığını ve içeriğini örtüyor** (`mevcut/02`, `/03`).
   Flyout açıkken ve dokunmatikte de çıkıyor.
8. **Telefonda flyout ~200 px'e sıkışıyor**, etiketler "Line he…", "Al…" diye kesiliyor,
   ana popover'ın üstüne biniyor (`mevcut/05`). `HorizontalPreferredLeft` dar ekranda yer bulamıyor.
9. İki popover aynı anda: odak yönetimi, Esc davranışı ve ekran okuyucu bağlamı karmaşık.

### Panel içleri
10. **Kontrast:** 4 preset etiketsiz "A" resimleri; arka plan/metin için 8'er renk;
    eylemler yalnız ikon (✓ ↺ ✕). Kontrast oranı önizlemede görünmüyor. Swatch'lar
    `sap.m.Image` + `press` — semantik olarak buton değil.
11. **Okuma yardımı / Metin aralığı:** 3–4 seçenek için `Select` + ayrı reset butonu.
    SegmentedButton tek dokunuşla daha hızlı ve daha görünür.
12. **Mavi ışık / Renk körlüğü:** slider + (−, ↺, +) üçlüsü aynı işi iki kez yapıyor;
    satır yüksekliğini ikiye katlıyor.
13. **Büyük imleç:** 5 ok + reset, renk adları yok (yalnız tooltip).
14. **TTS:** oynatıcı ikonları iyi; ama "Hover Reading" switch'i ortalanmış ve OFF etiketi
    sıkışık; hız "1.0x" olarak gösteriliyor; 1.0 için "Normal" daha anlaşılır.
15. **Reset All** pembe zeminle sürekli kırmızı vurgulu; tehlikeli eylem gibi değil,
    ikincil eylem gibi durmalı (aktif özellik yokken pasif).

### Tema / CSS
16. **Gece modunda aktif satır okunmuyor:** "Deactivate Night Mode" açık pembe zemin
    üstünde açık metin (`mevcut/04`); "Off" Select'i karanlıkta çok soluk.
17. **Renkler sabit kodlu** (`#1e3a8a`, `#3b82f6`, `#d5e3fa`…), `style.css` 1209 satır,
    257 `!important`. Horizon Dark / HCB / HCW ve müşteri temasına uymuyor; gece modu
    için ayrı override katmanı gerekiyor.
18. Gradyan başlık Fiori uygulamalarında yabancı duruyor (shell bar düz renkli).
19. Popover kaydırması `transform: translateX(-12px)` hack'iyle yapılıyor.

20. **High-contrast temalar (proje kuralı gereği denendi, `mevcut/06-*`):**
    - **HCB (sap_horizon_hcb):** popover beyaz zemin + mavi gradyanla kalıyor, HC temasını
      hiç almıyor. "Reading Aid" ve "Activate Blue Filter" satırları **siyah zemin üstünde
      lacivert yazı**, okunmuyor (kontrast ≈ 1,3 : 1). Kaynağı: genişletilebilir Panel'lerin
      header toolbar'ı tema rengini alıyor, metin rengi ise sabit `#1e3a8a`.
    - **HCW:** okunabilir, ama satır başlıkları ve ikonlar HC siyahı yerine sabit lacivert,
      Reset All pembe zeminli; HCW'nin kalın siyah kenar/odak dili yok.
    - Erişilebilirlik aracının kendisi HC kullanıcısına uymuyor; çözüm 1. adımdaki
      tema token'ları (`--sapList_Background`, `--sapContent_ForegroundColor`, `--sapList_SelectionBorderColor`…).

## 2. Öneri — Varyantlar (mockups.html)

| | Ne | Artı | Eksi |
|---|---|---|---|
| **A** Gruplu liste + durum | Bugünkü listenin evrimi; alt yazıda değer, switch veya ›  | En az kod değişikliği | Detay yine flyout'ta kalırsa 7–9 çözülmez |
| **B** Profiller + kutucuk | Ein-Tipp profilleri, 3×4 kutucuk, ayar kutucuğun altında | Kompakt, dokunmatik dostu | 12 kutucuk etiketleri kısalıyor; SAP görünümünden uzak |
| **C** Drill-down (önerilen) | A'daki liste; › aynı popover içinde detay sayfası açar (NavContainer, geri oku) | Tek popover, çakışma yok, desktop=mobil, odak yönetimi basit | Flyout fragment'ı sayfalara bölünmeli |
| **D** Mobil bottom-sheet | <600 px'te C'nin alttan açılan hali | Telefon kullanılabilir | ResponsivePopover/Dialog ayrımı gerek |

**Önerim: C + D, A'nın gruplama/durum dili ve B'nin profil çipleriyle.**

## 3. Uygulama planı (önerilen sıra)

1. **Tasarım token'ları:** `--sa-*` CSS değişkenleri, değerleri SAP tema parametrelerinden
   (`--sapBrandColor`, `--sapList_Background`, `--sapContent_LabelColor`, `--sapList_SelectionBackgroundColor`…).
   Gece modu/HC için ayrı renk kuralı yerine token'lar kendiliğinden değişir; `!important` sayısı düşer. (16, 17, 18, 20)
2. **Popover → `sap.m.ResponsivePopover` + `NavContainer`:** ana sayfa + her özellik için
   detay sayfası; Flyout.fragment.xml kaldırılır. Telefonda otomatik tam ekran/bottom-sheet. (7, 8, 9, 19)
3. **Satır modeli tekleştir:** her satır = ikon · sabit ad · durum alt yazısı · sağda
   `Switch` (anlık özellik) ya da › (ayarlı özellik). Satır tıklaması asla gizli ayar
   uygulamaz; Renk körlüğü detayında mod seçilene kadar filtre uygulanmaz. (1, 2, 3)
4. **Gruplar:** Görme (Yazı, Kontrast, Gece, Renk, Mavi ışık) · Okuma (Vorlesen, Okuma
   yardımı, Linkler) · Hareket/Dikkat (Animasyon, Resimler, İmleç). (4)
5. **Detay sayfası şablonu:** canlı önizleme kutusu → preset SegmentedButton (100/125/150/175/200 %) →
   ince ayar slider'ları (−/+ yerine slider + klavye ok tuşları; −/+ yalnız yazı boyutunda) →
   altta "Standarda dön" + "Bitti". (6, 11, 12)
6. **Kontrast sayfası:** SAP HC temaları SegmentedButton; etiketli şema kartları + WCAG oranı;
   "Özel renk" açılır bölümde; "İptal / Uygula" metinli. Swatch'lar `sap.m.Button`/`ToggleButton`
   (rol + aria-pressed). (10)
7. **Launcher rozeti:** FAB/Button üzerinde aktif özellik sayısı + `aria-label` "3 Funktionen aktiv". (2)
8. **Profiller (opsiyonel, B'den):** Sehschwäche, Legasthenie, Epilepsie-sicher, Konzentration —
   her biri mevcut ayarların kombinasyonu; yeni filtre kodu gerektirmez. (2)
9. **İpucu balonu:** yalnız `(hover: hover)` cihazlarda, ana listede ve 600 ms gecikmeyle;
   kısayol bilgisi satır alt yazısına/başlıktaki ⌨ yardım sayfasına taşınır. (7)
10. **Reset All:** footer'da ikincil buton; aktif özellik yoksa disabled; onay yerine
    5 sn "Geri al" MessageToast'u. (15)

## 4. Ölçü / stil kılavuzu (mockup'larda kullanılan)

- Popover 360 px, köşe 16 px, gölge `0 12px 40px rgba(29,45,62,.16)`; başlık düz, gradyan yok.
- Satır min. 48 px (mobil 56 px), ikon kutusu 34 px / 9 px köşe; aktifte dolu marka rengi.
- Bölüm başlığı 11 px büyük harf, `--sapContent_LabelColor`.
- Dokunma hedefi ≥ 44 px, odak halkası `:focus-visible` 2 px marka rengi (mevcut kural korunur).
- Metin 14/12 px; popover metni host zoom'dan izole kalmaya devam eder.
