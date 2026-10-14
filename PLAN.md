# PLAN.md — Storyline-lite (Vue + SCORM) Uygulama Planı

Hedef: MEB/EBA için Storyline benzeri, web tabanlı, SCORM paketleyen içerik editörü.
Kapsam dışı: Rise, Review, Replay, Peek, içerik kütüphanesi (Articulate 360'ın diğer ürünleri).

---

## 1. NASIL KULLANILIR (3 kural)

1. **Sırayla ilerle.** Prompt'u atla, ajan bitirsin, **Kabul** maddesini elle test et.
2. **Geçerse commit, geçmezse düzeltme.** Geçmeyen adımdan sonrakine geçme.
3. **Her prompt öncesi** `git commit`. Her kapıda (KAPI-1/2/3) `git tag`.

Düzeltme promptu şablonu (hata çıkarsa):
```
.agent/rules.md ve ARCHITECTURE.md'yi oku. Şu hata var: <hata + ekran/konsol çıktısı>.
Sadece bu hatayı düzelt, başka dosyaya dokunma, ilgili testi ekle, tüm testler geçmeli.
```

Her prompt'un başına otomatik olarak şunu ekle:
```
Önce .agent/rules.md ve ARCHITECTURE.md'yi oku. Kurallara uy.
```

---

## 2. ADIM 0 (elle, prompt değil)

```
git init            # yoksa
.gitignore          # node_modules, dist
git add . && git commit -m "calisan faz3"
git tag v-calisan-faz3
```
Ayrıca `C:\Users\Hakan\icerik2` klasörünün zip yedeğini al.

---

## 3. HEDEF KLASÖR YAPISI (mevcut yapıya sadece EKLEME)

```
src/
  core/       saf iş mantığı (tracking kararı, koşul hesabı, soru değerlendirme, yayın kontrolü)
  schema/     defaults.js, projectSchema.js (Zod), migrate.js, templates.js
  runtime/    ortak oynatıcı çekirdeği (önizleme + SCORM paketi AYNI dosyaları kullanır)
  services/   mevcut + projectStorage.js, assetStore.js, scorm12Adapter.js, scorm2004Adapter.js
  stores/     courseStore.js (kalır) + historyStore.js
  components/
    layout/   mevcut + TimelineBar.vue
    panels/   TrackingSettings, VariablesPanel, TriggersPanel, StatesPanel, AssetLibrary ...
tests/        regression/, unit/, fixtures/
```

---

## 4. KURAL DOSYASI (Prompt 0 bunu üretir; referans metin)

`.agent/rules.md` içeriği:
- Dil: JavaScript + JSDoc. TypeScript'e geçme.
- Mevcut klasör yapısı taşınmaz; sadece yeni klasör/dosya eklenir.
- Mevcut çalışan özellikler bozulmaz. Her değişiklik tek amaçlı.
- İş mantığı store'da değil `src/core` ve `src/runtime` içinde, saf fonksiyon olarak. Store sadece çağırır.
- `src/runtime` dosyaları bağımlılıksız düz JS'dir (import/export yok, `window.EP` isim alanı). Editör kodunu asla import etmez.
- Oynatıcı kodu JS template string içine YAZILMAZ. Runtime dosyaları normal `.js`; exporter bunları Vite `?raw` ile pakete gömer.
- Yeni veri alanı eklenince `schemaVersion` artırılır ve `migrate.js` güncellenir.
- Her yeni özellik için en az bir test yazılır; `npm run test` her zaman yeşil olmalı.
- Kullanıcıya görünen tüm metinler Türkçe.
- KORUNACAK DÜZELTMELER: regex kaçış düzeltmesi; manifestte `isvisible="true"`; gereksiz namespace yok; wrapper'da katı karşılaştırma (`=== "true"`); güvenli pencere taraması; sınav bitene kadar `incomplete`; ASCII `slugify` zip adı.
- Medya projede base64 olarak tutulmaz, `assetId` referansı kullanılır (Prompt 5'ten sonra).
- Undo/redo komut tabanlı değil, proje durumunun `structuredClone` snapshot'ı ile yapılır.

---

## 5. PROMPT LİSTESİ

### FAZ A — Güvenli temel

#### P0 — Denetim ve kurallar (kod değiştirme)
```
Projeyi tara, KODU DEĞİŞTİRME.
1) ARCHITECTURE.md oluştur: klasör yapısı, courseStore.js veri modeli (slide, layer, object, quiz, buton tetikleyici alanları), exporter akışı.
2) Denetim yaz: (a) PreviewModal.vue ile scormPlayerTemplate.js arasında tekrarlanan mantığı (slayt gezme, quiz değerlendirme, tetikleyici, puanlama) işlev bazında listele. (b) Kaydetme/yükleme (localStorage, IndexedDB, dosya) var mı, nerede. (c) Resimler projede base64 mı, URL mi. (d) scormPlayerTemplate.js ve scormWrapperTemplate.js içinde template string kaçışı gerektiren riskli yerler.
3) .agent/rules.md oluştur (aşağıdaki kuralları aynen yaz): <PLAN.md Bölüm 4 içeriğini yapıştır>.
```
**Kabul:** iki dosya var, kod değişmedi (`git diff` sadece yeni dosyalar).

#### P1 — Test ağı (regresyon)
```
Vitest ve jsdom ekle, "npm run test" tanımla. tests/regression/ altında:
(1) manifestGenerator çıktısı: isvisible="true", gereksiz namespace yok, geçerli XML.
(2) slugify: Türkçe karakterler ASCII olur.
(3) scormExporter zip içerik listesi.
(4) scormPlayerTemplate çıktısını jsdom'a yükle, sahte SCORM 1.2 API ile: tek soruda doğru/yanlış, çoklu soruda sınav bitmeden failed olmaması, bitişte passed/failed, cmi.core.score.raw değeri.
Örnek projeler tests/fixtures/ altında JSON: basit, 3 soruluk sınavlı.
Mevcut kodu DEĞİŞTİRME; testler mevcut davranışı kaydetsin, hepsi geçsin.
```
**Kabul:** `npm run test` yeşil.

#### P2 — Ortak runtime (davranış değişikliği YOK)
```
ARCHITECTURE.md denetimine göre PreviewModal.vue ve scormPlayerTemplate.js'deki ortak oynatıcı mantığını src/runtime/ altına çıkar: sahne çizimi, slayt gezinme, quiz değerlendirme, buton tetikleyicileri, puan/durum hesabı. Dosyalar bağımlılıksız düz JS (import/export yok, window.EP isim alanı). PreviewModal bunu kullansın; scormExporter Vite ?raw import'u ile paket içine gömsün. scormPlayerTemplate artık string içinde kod yazmasın, runtime dosyalarını birleştirsin. SCORM wrapper davranışı birebir aynı kalsın.
```
**Kabul:** P1 testleri yeşil + önizleme eskisi gibi + paket SCORM Cloud'da açılıp tamamlanıyor (**elle**).
> **KAPI-1:** geçmeden devam etme. `git tag v-runtime`.

#### P3 — Şema versiyonlama
```
src/schema/ altında defaults.js, projectSchema.js (Zod), migrate.js oluştur. Projeye schemaVersion: 1 ekle. migrate: eksik alanları doldur (object.timeline {start:0,duration:null}, object.states [], project.variables [], settings.tracking varsayılanları). courseStore'un yükleme noktalarında migrate çağrılsın. Eski formatlı projenin v1'e dönüşme testi yaz. Dışa aktarım çıktısı eskisiyle aynı kalmalı.
```
**Kabul:** testler yeşil, eski proje açılıyor, paket aynı çıktı.

#### P4 — Kaydet / Yükle
```
(Önce ARCHITECTURE.md'de kaydetme var mı bak; varsa onu bu yapıya uyarla.)
src/services/projectStorage.js: IndexedDB'ye otomatik kayıt (değişiklik varsa 5 sn debounce), "Proje Kaydet" (.zip: project.json + assets), "Proje Aç" (zip, Zod doğrulama, migrate). Hata mesajları Türkçe. TopNavbar'a Aç/Kaydet butonları. Test yaz.
```
**Kabul:** sayfa yenilenince proje geri gelir; zip kaydet/aç sonrası birebir aynı.

#### P5 — Asset yöneticisi
```
src/services/assetStore.js: resim/ses/video IndexedDB'de Blob olarak saklansın, projede sadece assetId tutulsun. panels/AssetLibrary.vue: listele, önizle, yeniden adlandır, sil, kullanılmayanları göster, toplam boyut. 50 MB üstü dosyada ve toplam 100 MB üstünde uyarı. Eski base64 görselleri migrate ile asset'e çevir. Exporter asset'leri pakete dosya olarak koysun.
```
**Kabul:** base64 kalmadı, proje JSON'u küçük, eski proje görselleri bozulmadan açılıyor, paket çalışıyor.

### FAZ B — Tracking ve LMS güvenliği

#### P6 — Tracking modu
```
panels/TrackingSettings.vue (TopNavbar'dan açılır): mod (Sadece Tamamlama / Sınav Puanı ve Başarı), geçme notu %0-100 (varsayılan 80), tamamlanma kriteri (son slayta ulaşma / tüm slaytları görme / sınavı bitirme), puan rozeti göster/gizle. Ayarlar project.settings.tracking içinde. Karar mantığı src/core/trackingDecision.js içinde saf fonksiyon; runtime kullanır. Mod A'da score.raw yazılmasın. Birim testler: her mod ve kriter, sahte SCORM API ile. P1 testleri yeşil kalmalı.
```
**Kabul:** testler yeşil; SCORM Cloud'da iki modda doğru durum (completed / passed / failed).

#### P7 — suspend_data ve devam etme
```
src/runtime/resume.js: kaldığı slayt, ziyaret edilenler, cevaplar kısa anahtarlı JSON olarak suspend_data'ya yazılsın. SCORM 1.2 sınırı 4096 karakter. pako (deflate+base64) ekle, exporter ?raw ile gömsün. Sınır aşılırsa önemsiz veriyi ele ve console.warn ver. Açılışta "Kaldığın yerden devam et / Baştan başla". Test: 30 slayt, 20 cevaplı proje yaz-oku kayıpsız ve 4096 altında.
```
**Kabul:** testler yeşil; LMS'te çık-gir ile kaldığı yerden devam ediyor.

#### P8 — Debug paneli
```
Oynatıcıya ?debug=1 ile açılan panel: SCORM API çağrı logu (Initialize, SetValue, Commit, Finish), suspend_data boyutu, güncel değişkenler (varsa), tetikleyici logu. Sadece bu parametreyle görünsün.
```
**Kabul:** normal açılışta panel yok, `?debug=1` ile var.

> **KAPI-2 (zorunlu, elle):** paketi gerçek EBA veya EBA'ya yakın bir LMS'e yükle. iframe boyutu, popup, ses otomatik oynatma, completion/score raporu kontrol et. Sorun varsa Faz C'ye geçmeden çöz. `git tag v-eba-dogrulandi`.

### FAZ C — Storyline'ın çekirdeği (değişken + tetikleyici + durum)

#### P9 — Undo / Redo (snapshot)
```
src/stores/historyStore.js: proje durumunun structuredClone snapshot'ı ile geri al/yinele. Sürükleme/boyutlandırma bitince TEK kayıt. Limit 100. Ctrl+Z, Ctrl+Y ve Ctrl+Shift+Z. Yeni kayıt, redo yığınını temizler. Test yaz.
```
**Kabul:** 20 farklı işlem yap, hepsini geri al → ilk hal.

#### P10 — Değişkenler
```
src/core/variables.js ve src/runtime/variables.js. Tip: sayı, metin, doğru/yanlış; ad, varsayılan, "SCORM'a kaydet" seçeneği. panels/VariablesPanel.vue: ekle/sil/yeniden adlandır. Metin kutularında {{degiskenAdi}} canlı gösterim (değer değişince güncellenir). Sistem değişkenleri: skor, denemeSayisi, mevcutSlayt, ziyaretEdilenSayisi. Değişkenler suspend_data'ya (resume.js) dahil olsun. Test yaz.
```
**Kabul:** metinde {{x}} önizlemede ve pakette aynı değeri gösterir; yeniden açılışta korunur.

#### P11 — Tetikleyici motoru
```
src/runtime/triggerEngine.js (bağımsız). Trigger = { olay, kosullar[], eylemler[] }.
Olaylar: tıklandı, üzerine gelindi, slayt açıldı, zaman çizelgesi başladı/bitti, değişken değişti, cevap doğru/yanlış, ses/video bitti.
Koşullar: değişken karşılaştırma (==, !=, >, <, >=, <=), nesne durumu, AND/OR.
Eylemler: slayta git, URL aç, değişken ayarla/artır, nesne göster/gizle, duruma geç, ses/video oynat-durdur, katman göster/gizle, dersi bitir.
panels/TriggersPanel.vue: seçili nesne/slayt için liste ve açılır listeli düzenleme formu. Eski buton tetikleyicilerini migrate ile yeni yapıya çevir; eski alan bir süre okunmaya devam etsin. Birim testler: koşul değerlendirme ve eylem yürütme.
```
**Kabul:** eski butonlar aynen çalışır; "değişken > 2 ise X slaytına git" kuralı hem önizlemede hem pakette çalışır.

#### P12 — Durumlar (States)
```
Nesnelere durum desteği: Normal, Üzerine gelince, Tıklandı, Devre dışı, Seçili + özel durumlar. Her durum renk, metin, opaklık, boyut, görsel farkını saklar. "Duruma geç" eylemi bunu kullanır. panels/StatesPanel.vue: durum ekle, durumdayken nesneyi düzenle. Buton varsayılan Normal/Hover/Tıklandı ile gelsin. Runtime'da uygulanır.
```
**Kabul:** buton hover/tıklama görsel değişimi önizleme ve pakette çalışır.

#### P13 — Katmanlar ve lightbox
```
Slayt katmanlarını tetikleyicilerle çalıştır: katman göster/gizle eylemi, "açılır pencere" katman tipi, katman açıkken alttaki slaytı kilitleme seçeneği, kapat butonu şablonu, Esc ile kapatma.
```
**Kabul:** butona tıkla → pencere açılır, alttaki slayt kilitli, kapat çalışır.

### FAZ D — Zaman çizelgesi ve animasyon

#### P14 — Zaman çizelgesi arayüzü (animasyon yok)
```
layout/TimelineBar.vue (App.vue alt panel): nesne başına satır, başlangıç ve süre çubuğu, sürükle-bırak ile taşı/boyutlandır, saniye cetveli, slayt süresi (veya "nesneler bitince"), playhead ile sahnede önizleme. Veri: object.timeline {start, duration}. Undo/redo ile uyumlu. Runtime nesneleri start/duration'a göre gösterip gizlesin.
```
**Kabul:** nesne 2. saniyede belirir, 5. saniyede kaybolur; önizleme ve paket aynı.

#### P15 — Giriş/çıkış animasyonları
```
src/runtime/animation.js (Web Animations API): giriş/çıkış için soluklaşma, kayma (4 yön), yakınlaşma, dönerek gelme. Süre, gecikme, easing. Zaman çizelgesiyle senkron. Animasyon paneli ve çizelgede önizleme. prefers-reduced-motion açıksa kısalt/kapat.
```
**Kabul:** başlık 0. saniyede solukla gelir, buton 2. saniyede soldan kayar; hem önizlemede hem pakette.

### FAZ E — Çoklu ortam

#### P16 — Ses
```
src/runtime/media.js: slayt anlatımı (voiceover), arka plan müziği, nesne ses efekti. Zaman çizelgesinde ses nesnesi. Ses bitince otomatik ilerleme seçeneği. Tarayıcı otomatik oynatma kısıtı için ilk slayttan önce "Başla" ekranı. Oynatıcıda ses seviyesi/sessiz. Boyut uyarısı assetStore'dan.
```
**Kabul:** "Başla" ile ses çalışır, otomatik ilerleme çalışır, paket boyutu uyarı verir.

#### P17 — Video ve altyazı
```
MP4/WebM video nesnesi: oynat/durdur/ilerleme, otomatik oynatma (sessiz), "video bitti" olayı, "izlenmeden ilerleme engellensin" seçeneği. YouTube/Vimeo gömme seçeneği. Ses/video için .vtt/.srt altyazı yükleme ve oynatıcıda aç/kapa. Büyük video uyarısı.
```
**Kabul:** video bitince tetikleyici çalışır, altyazı açılıp kapanır.

### FAZ F — Soru ve değerlendirme

#### P18 — Soru tipleri
```
src/core/questionTypes/ altında her tür için ayrı değerlendirici + test: doğru/yanlış, çoklu seçim, boşluk doldurma, eşleştirme (sürükle-bırak), sıralama, sıcak nokta, sürükle-bırak yerleştirme. Her soru: puan, deneme hakkı, geri bildirim (doğru/yanlış/kısmi), ipucu. PropertyPanel'de soru formu türe göre değişsin. Mevcut çoktan seçmeli bozulmasın.
```
**Kabul:** her tür için değerlendirici testi yeşil, paketten çözülebiliyor.

#### P19 — Sınav akışı
```
src/runtime/quizFlow.js: soru grubu, soru/şık karıştırma, banka'dan rastgele N soru, sonuç slaytı (puan, geçti/kaldı, tekrar dene), yanlışları gözden geçirme. Tracking ayarlarıyla bağlı çalışsın, cmi.interactions.n.* yazsın. Sınav bitene kadar incomplete kuralı korunsun.
```
**Kabul:** P1 regresyon testleri yeşil; SCORM Cloud'da interactions görünüyor.

### FAZ G — Tasarım ve gezinme

#### P20 — Ana slayt, tema, şablonlar
```
src/schema/templates.js: ana slayt (renk paleti, yazı tipi, arka plan, logo/alt bilgi), tema seçimi, hazır slayt şablonları (Başlık+2 sütun, resim karşılaştırma, bilgi kartı, zaman çizelgesi, sekmeli içerik, akordeon). Şablon seçici modal, tek tıkla ekle.
```
**Kabul:** tema değişince tüm slaytlar güncellenir, şablonlar eklenir ve pakette çalışır.

#### P21 — Oynatıcı arayüzü ve ölçekleme
```
Ayarlanabilir player skin: ilerleme çubuğu, ileri/geri, içindekiler (yan panel), ses, tam ekran, kapat; görünürlük settings.player'dan. Gezinme kilidi: serbest / sıralı / sınav geçilmeden kilitli. Sahne 16:9 veya 4:3 tasarım boyutundan konteynere oran korunarak ölçeklensin; mobil dokunma; EBA iframe boyutlarını deneyen test sayfası.
```
**Kabul:** farklı iframe boyutlarında bozulma yok.

#### P22 — Erişilebilirlik
```
Her nesneye alt metin ve okuma sırası. Oynatıcıda tam klavye gezintisi (Tab, Enter/Space, Esc), odak göstergesi, ARIA rolleri, geri bildirim için canlı bölge. Editörde kontrast uyarısı.
```
**Kabul:** fare olmadan tüm dersi tamamlayabiliyorsun.

### FAZ H — Standartlar ve yayın

#### P23 — SCORM 2004
```
Ortak LMS adaptör arayüzü (initialize, setScore, setStatus, setLocation, setSuspend, finish). src/services/scorm12Adapter.js (mevcut davranış) ve scorm2004Adapter.js (cmi.completion_status, cmi.success_status, cmi.score.scaled; 4th Edition manifest). Dışa aktarma penceresinde sürüm seçimi. 1.2 çıktısı değişmesin. xAPI için sadece tasarım notu yaz, kod yazma.
```
**Kabul:** 1.2 regresyon testleri yeşil; 2004 paketi SCORM Cloud'da çalışır.

#### P24 — Yayın kontrolü
```
src/core/publishCheck.js: dışa aktarmadan önce kırık tetikleyici hedefi, kullanılmayan asset, alt metni eksik nesne, paket boyutu, tahmini suspend_data boyutu, tanımsız değişken kullanımı. Türkçe liste, kritik olanlarda uyarı.
```
**Kabul:** bilerek bozuk bir proje sorunları listeler.

> **KAPI-3:** tüm testler yeşil + son paket EBA'da denendi. `git tag v1.0`.

---

## 6. ÖZET SIRA (hızlı bakış)

| Faz | Prompt | Kapı |
|---|---|---|
| A Güvenli temel | P0–P5 | KAPI-1 (P2 sonrası) |
| B Tracking/LMS | P6–P8 | KAPI-2 (EBA testi) |
| C Çekirdek | P9–P13 | |
| D Zaman/animasyon | P14–P15 | |
| E Çoklu ortam | P16–P17 | |
| F Soru | P18–P19 | |
| G Tasarım | P20–P22 | |
| H Standart/yayın | P23–P24 | KAPI-3 |

## 7. ALTIN KURALLAR

- Test yeşil değilse yeni prompt yok.
- Ajan "bitti" derse inanma; Kabul maddesini elle dene.
- Paket boyutunu Faz E boyunca her adımda kontrol et.
- Bir prompt çok büyük gelirse ikiye böl (örn. P11: önce motor+testler, sonra panel).
- Ajan klasör taşımaya veya TypeScript'e geçmeye kalkarsa durdur, kuralları hatırlat.
