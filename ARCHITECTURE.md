# ARCHITECTURE.md — Storyline-lite (Vue + SCORM) Mimari ve Denetim Belgesi

Bu belge, projenin mevcut dosya yapısını, veri modelini, dışa aktarım (exporter) akışını ve bir sonraki aşamalara temel oluşturacak teknik denetim (audit) bulgularını içerir.

---

## 1. Mevcut Klasör ve Dosya Yapısı

```text
C:\Users\Hakan\icerik2\
│
├── baslat.bat                          # Yerel Vite geliştirici sunucusunu (port 5180) ve tarayıcıyı açan başlatıcı
├── index.html                          # Vite uygulamasının SPA ana HTML kabuğu
├── package.json                        # Bağımlılıklar (Vue 3, Pinia, Vite, JSZip, FileSaver, Lucide) ve betikler
├── package-lock.json                   # Kilitli npm paket bağımlılıkları
├── vite.config.js                      # Vite yapılandırma dosyası (@vitejs/plugin-vue, port 5180)
├── PLAN.md                             # Projenin faz ve prompt uygulama yol haritası
│
├── .agent\
│   └── rules.md                        # Ajan çalışma ve geliştirme kuralları
│
├── dist\                               # "npm run build" üretim çıktısı
│   ├── index.html
│   └── assets\
│       ├── index-[hash].js
│       └── index-[hash].css
│
└── src\
    ├── main.js                         # Vue 3 bootstrap, Pinia entegrasyonu, main.css yükleme
    ├── App.vue                         # Ana uygulama çerçevesi (Workspace grid, layout bileşenleri, modal ve toast)
    │
    ├── assets\
    │   └── main.css                    # Global CSS değişkenleri, renk teması ve temel sıfırlama stilleri
    │
    ├── components\
    │   ├── layout\
    │   │   ├── TopNavbar.vue           # Üst araç çubuğu (Ders başlığı, nesne/soru ekleme araçları, önizleme ve export)
    │   │   ├── SlideSidebar.vue        # Sol slayt paneli (Slayt listesi, küçük önizlemeler, ekleme/silme/kopyalama)
    │   │   ├── StageCanvas.vue         # 960x540 tasarım sahnesi (Eleman konumlandırma, seçme, z-index sıralaması)
    │   │   ├── PropertyPanel.vue       # Sağ panel (Konum, boyut, renk, metin, tetikleyici ⚡ ve soru ayarları)
    │   │   └── PreviewModal.vue        # Canlı önizleme penceresi (Ders simülasyonu, test çözümü, dallanma)
    │   │
    │   └── stage\
    │       └── StageElement.vue        # Sahne eleman kabuğu (Metin, Buton, Şekil, Görsel; taşıma/boyutlandırma tutamaçları)
    │
    ├── stores\
    │   └── courseStore.js              # Pinia merkezi durum deposu (Slaytlar, nesneler, aktif seçimler, soru state'i)
    │
    └── services\
        ├── manifestGenerator.js        # SCORM 1.2 "imsmanifest.xml" oluşturan servis
        ├── scormExporter.js            # JSZip ile SCORM 1.2 .zip paketi derleyen ve indiren servis
        ├── scormPlayerTemplate.js      # Pakete gömülen bağımsız (standalone) HTML5 oynatıcı şablonu (string template)
        └── scormWrapperTemplate.js     # LMS ile haberleşen standart SCORM 1.2 API sarmalayıcısı (pipwerks tabanlı)
```

---

## 2. `courseStore.js` Veri Modeli

Pinia deposundaki durum hiyerarşisi tekil bir ders nesnesi etrafında şekillenir:

### 2.1. Ana State Alanları
```javascript
{
  courseTitle: "Yeni E-Öğrenme Dersi",   // string: Ders başlığı
  author: "Eğitmen",                     // string: Yazar adı
  activeSlideId: "slide-1",              // string: Editörde o anda seçili slayt ID'si
  selectedElementId: null,               // string | null: Sahnede o anda seçili eleman ID'si
  slides: [ /* Slide nesneleri dizisi */ ]
}
```

### 2.2. Slayt (`Slide`) Modeli
Her slayt nesnesi iki temel tipten birine (`'content'` veya `'quiz'`) aittir:

```javascript
{
  id: "slide-1700000000000",             // string: Benzersiz slayt kimliği
  type: "content",                       // 'content' | 'quiz'
  title: "Giriş Slaytı",                 // string: Slayt başlığı
  background: "#ffffff",                 // string: Slayt arka plan rengi (Hex)
  elements: [ /* Element nesneleri */ ], // Array: Sahnedeki çizim ve etkileşim elemanları
  quiz: { /* Quiz nesnesi (Yalnızca type === 'quiz' ise mevcuttur) */ }
}
```

### 2.3. Katman (`Layer`) Durumu
* **Mevcut Durum:** Projede şu an Articulate Storyline benzeri bağımsız bir **Slide Layer (Slayt Katmanı)** veri modeli (modal layer, feedback layer, sub-layer vb.) **bulunmamaktadır**.
* **Mevcut Katmanlama:** Slayt içindeki nesneler arasındaki öncelik sıralaması her elemanın üzerindeki `zIndex` (tamsayı) özelliği üzerinden sağlanmaktadır.

### 2.4. Nesne (`Object` / `Element`) Modeli
Tüm nesneler ortak geometrik ve eylem alanlarına sahiptir; tipe göre ek alanlar barındırır:

#### Ortak Alanlar (Tüm Elemanlar):
```javascript
{
  id: "elem-1700000000000",              // string: Benzersiz eleman kimliği
  type: "text",                          // 'text' | 'button' | 'shape' | 'image'
  x: 150,                                // number: Sahnedeki X konumu (px)
  y: 150,                                // number: Sahnedeki Y konumu (px)
  width: 200,                            // number: Genişlik (px)
  height: 100,                           // number: Yükseklik (px)
  zIndex: 1,                             // number: Katman derinlik sırası
  action: {                              // Object: Tetikleyici / tıklama eylemi
    type: "none",                        // 'none' | 'jumpToSlide' | 'openUrl'
    targetSlideId: "",                   // string: Atlama yapılacak hedef slayt ID'si
    url: ""                              // string: Açılacak web adresi
  }
}
```

#### Tipe Özel Alanlar:
* **Metin (`type: 'text'`):**
  * `text`: `string` (Görüntülenecek metin)
  * `fontSize`: `number` (Punto boyutu, örn: 20)
  * `fontColor`: `string` (Yazı rengi hex, örn: `#1e293b`)
  * `fontBold`: `boolean` (Kalın yazı)
  * `fontItalic`: `boolean` (İtalik yazı)
  * `textAlign`: `'left' | 'center' | 'right'` (Hizalama)
* **Etkileşimli Buton (`type: 'button'`):**
  * `text`: `string` (Buton etiketi)
  * `fontSize`: `number` (Font boyutu)
  * `fontColor`: `string` (Yazı rengi)
  * `bgColor`: `string` (Buton arka plan rengi)
  * `borderRadius`: `number` (Köşe yuvarlama px)
  * `action`: (Tetikleyici objesi — butonlar birincil eylem taşıyıcısıdır)
* **Geometrik Şekil (`type: 'shape'`):**
  * `shapeType`: `'rectangle' | 'circle' | 'pill'`
  * `fillColor`: `string` (Dolgu rengi)
  * `borderColor`: `string` (Kenarlık rengi)
  * `borderWidth`: `number` (Kenarlık kalınlığı px)
  * `borderRadius`: `number` (Köşe yuvarlama px)
* **Görsel (`type: 'image'`):**
  * `src`: `string` (Web URL'i veya base64 Data URL)
  * `objectFit`: `'cover' | 'contain'`
  * `borderRadius`: `number` (Köşe yuvarlama px)

### 2.5. Soru (`Quiz`) Modeli
Yalnızca `type === 'quiz'` olan slaytlarda bulunur:
```javascript
{
  question: "Aşağıdakilerden hangisi SCORM avantajıdır?", // string: Soru metni
  options: [                                             // Array: Çoktan seçmeli şıklar
    { id: "A", text: "Taşınabilirlik ve LMS uyumluluğu" },
    { id: "B", text: "Tek sunucuya bağımlı olması" },
    { id: "C", text: "Puan kaydetmemesi" },
    { id: "D", text: "Sadece masaüstünde açılması" }
  ],
  correctAnswer: "A",                                    // string: Doğru seçeneğin ID'si ('A' | 'B' | 'C' | 'D')
  points: 100,                                           // number: Sorunun puan değeri
  feedbackCorrect: "Tebrikler! Doğru cevap.",            // string: Doğru cevap anında gösterilecek mesaj
  feedbackIncorrect: "Maalesef yanlış cevap."            // string: Yanlış cevap anında gösterilecek mesaj
}
```

---

## 3. Exporter (SCORM 1.2 Dışa Aktarma) Akışı

SCORM paketi oluşturma süreci [`scormExporter.js`](file:///C:/Users/Hakan/icerik2/src/services/scormExporter.js) üzerinden şu sıra ile işletilir:

```
[Kullanıcı: "SCORM 1.2 Dışa Aktar" Tıklar]
                  │
                  ▼
1. Dosya Adı Güvenliği (slugify):
   - Türkçe karakterler ASCII karşılıklarına dönüştürülür (ç->c, ğ->g, ö->o, vb.)
   - Geçersiz karakterler temizlenir: "[Ders_Adi]_SCORM12.zip"
                  │
                  ▼
2. Ders Verisi Hazırlığı (course-data.js):
   - store.slides nesnesi structuredClone / JSON deep clone ile Vue reaktifliğinden ayrıştırılır.
   - JSON formatına dönüştürülür; olası "</script>" tag kırılmaları "<\\/script" ile kaçırılır.
   - "window.COURSE_DATA = window.COURSE_DATA || { ... };" olarak ZIP köküne yazılır.
                  │
                  ▼
3. Manifest Oluşturma (imsmanifest.xml):
   - manifestGenerator.js çağrılır.
   - Soru slaytı varlığı kontrol edilir (hasQuizzes).
   - SCORM 1.2 CAM uyumlu XML üretilir (isvisible="true", dinamik adlcp:masteryscore, imscp/adlcp şemaları).
   - "imsmanifest.xml" olarak ZIP köküne yazılır.
                  │
                  ▼
4. SCORM API Sarmalayıcısı (SCORM_API_wrapper.js):
   - scormWrapperTemplate.js içerisindeki pipwerks sarmalayıcı kodu alınır.
   - "SCORM_API_wrapper.js" olarak ZIP köküne yazılır.
                  │
                  ▼
5. Bağımsız Oynatıcı Oluşturma (index.html):
   - scormPlayerTemplate.js şablonundaki yer tutucular fonksiyonel replacer ile doldurulur:
     * /* INJECT_SCORM_WRAPPER */ -> sarmalayıcı kodu
     * /* INJECT_COURSE_DATA */   -> ders verisi
   - "index.html" olarak ZIP köküne yazılır (hem gömülü hem harici script desteği ile tam çift koruma).
                  │
                  ▼
6. ZIP Paketleme ve İndirme:
   - JSZip kütüphanesi DEFLATE Seviye 6 sıkıştırmasıyla zip Blob'u üretir.
   - FileSaver.saveAs ile tarayıcı üzerinden kullanıcıya indirilir.
```

---

## 4. Denetim (Audit) Bölümü

### (a) `PreviewModal.vue` ile `scormPlayerTemplate.js` Arasında Tekrarlanan Mantık
Şu an editör içi önizleme modalı ile dışa aktarılan SCORM oynatıcısı iki ayrı kod tabanında tamamen aynı iş mantığını bağımsız olarak uygulamaktadır:

| İşlev | `PreviewModal.vue` İmplementasyonu | `scormPlayerTemplate.js` İmplementasyonu | Çift Kod Bakım Riski |
| :--- | :--- | :--- | :--- |
| **Slayt Gezintisi** | Vue `ref(currentSlideIndex)`, `nextSlide()`, `prevSlide()`, computed `progressPercent` | Düz JS `var currentSlideIndex`, `nextSlide()`, `prevSlide()`, DOM `#progressFill` genişlik hesabı | Birinde yapılan gezinme kısıtı veya mantık değişikliği diğerine yansımıyor. |
| **Quiz Durum Takibi** | Vue `ref(quizState)`: `{ [id]: { selected, isSubmitted, isCorrect } }` | Düz JS `var quizAnswers = {}`: `{ [index]: { selected, isSubmitted, isCorrect } }` | Önizlemede anahtar olarak `slide.id`, şablonda ise `slideIndex` kullanılıyor; indeks kayması uyumsuzluk riski taşıyor. |
| **Quiz Değerlendirme** | `submitQuizAnswer()` fonksiyonunda doğruluğu yerel state'e yazma | `submitBtn.onclick` + `calculateEvaluation()` fonksiyonunda ağırlıklı puan ve %80 geçme hesabı | Soru değerlendirme formülü tek merkezde değil. |
| **Tetikleyici (Trigger)** | `handleElementClick()`: `jumpToSlide` (indeks bulup atlar) ve `openUrl` (http ekleyip açar) | `executeTrigger()`: `jumpToSlide` (döngüyle slayt arar) ve `openUrl` (http kontrolüyle açar) | Yeni bir tetikleyici türü (örn: nesne göster/gizle) eklendiğinde iki ayrı dosyaya el ile yazılmak zorunda. |
| **Puan ve Durum Hesabı** | Yok (Sadece `isCompleted` boolean değeri var, puan toplamı ve LMS statüsü hesaplanmıyor) | `calculateEvaluation()`, `syncQuizWithScorm()`: Ham puan, normalize yüzde, `passed`/`failed`/`incomplete` hesabı | Önizlemede görünen sonuç ile SCORM Cloud'daki LMS sonucu birebir aynı deneyimi sunamıyor. |

> **Hedef (P2 Adımı):** Bu ortak mantığın `src/runtime/` altına bağımsız, düz JS fonksiyonları olarak çıkarılması ve hem `PreviewModal`'ın hem de `scormExporter`'ın aynı dosyaları kullanması sağlanmalıdır.

---

### (b) Projede Kaydetme / Yükleme (Persistence) Durumu
* **`localStorage` / `sessionStorage`:** Projede **hiç kullanılmamaktadır** (0 eşleşme).
* **`IndexedDB`:** Projede **hiç kullanılmamaktadır** (0 eşleşme).
* **Dosya Tabanlı Proje Kaydetme / Açma:**
  * Projede `.story`, `.json` veya proje kaynak dosyalarını diske kaydeden veya dışarıdan açan bir mekanizma **yoktur**.
  * Tek dosya indirme işlemi, derlenmiş dağıtım paketi olan `[Ders]_SCORM12.zip` ihracıdır. Bu zip'ten projeyi editöre geri yükleme özelliği bulunmamaktadır.
* **Sonuç:** Kullanıcı tarayıcı sekmesini kapattığında veya sayfayı yenilediğinde (F5), `courseStore.js` hafızadaki varsayılan başlangıç durumuna sıfırlanmakta ve yapılan tüm çalışmalar kaybolmaktadır.

---

### (c) Resimlerin Projedeki Durumu (Base64 vs. URL)
Projede resim yönetimi incelendiğinde her iki yöntemin de hibrit olarak kullanıldığı tespit edilmiştir:
1. **Harici URL:**
   * Araç çubuğundan görsel eklendiğinde varsayılan olarak bir Unsplash web URL'i (`https://images.unsplash.com/...`) atanmaktadır.
   * `PropertyPanel.vue` üzerindeki URL giriş alanına yazılan adresler de doğrudan string URL olarak saklanır.
2. **Base64 Data URL:**
   * Kullanıcı yerel bilgisayarından bir görsel seçtiğinde (`PropertyPanel.vue` -> `handleFileUpload`), dosya `FileReader.readAsDataURL(file)` ile okunmakta ve `data:image/png;base64,...` formatında devasa bir string olarak `element.src` içerisine yazılmaktadır.
3. **Mevcut Durumun Riskleri:**
   * Ayrı bir varlık/medya kütüphanesi (`assetStore`) bulunmadığı için birkaç yüksek çözünürlüklü görsel yüklendiğinde `courseStore` boyutu onlarca megabayta çıkmakta; hem Pinia hafızasını şişirmekte hem de `index.html` içine gömülürken HTML dosya boyutunu aşırı büyütmektedir.

---

### (d) Şablon Stringlerinde (Template String) Kaçış ve Güvenlik Riskleri

`scormPlayerTemplate.js` ve `scormWrapperTemplate.js` dosyaları ES6 Template Literal (ters tırnak `` `...` ``) içinde saklanan devasa metin bloklarıdır. Bu mimari şu riskleri barındırmaktadır:

1. **Kaçış Çizgisi (Backslash `\`) Yitimi:**
   * Ters tırnak içerisindeki tek ters çizgiler (`\`) JS derleyicisi tarafından kaçış karakteri olarak yorumlanır.
   * *Örnek (Daha önce yaşanan hata):* `!/^https?:\/\//` ifadesi template string içinde değerlendirildiğinde `!/^https?:///` haline gelerek oynatıcının `SyntaxError: Unexpected identifier` ile çökmesine neden olmuştur.
   * *Riskli Bölgeler:* Regex ifadeleri, `\n`, `\t`, `\d`, `\s` gibi karakter sınıfları ve string içi tırnak kaçışları. Bu dosyalarda regex kullanımından kaçınılmalı veya `\\` çift kaçış uygulanmalıdır.
2. **İfade İnterpolasyonu (`${...}`) Riski:**
   * Şablon içerisinde gelecekte yazılabilecek herhangi bir ES6 `${değişken}` ifadesi, oynatıcı çalışma zamanında değil, Vue/Vite derleme zamanında çözülmeye çalışılır ve tanımsız değişken hatası verir.
3. **Kapanış Etiketi ve XSS Kırılması (`</script>`):**
   * Ders içeriğindeki metinlerde, soru şıklarında veya buton metinlerinde `</script>` ifadesi geçtiğinde, tarayıcının HTML ayrıştırıcısı JavaScript bloğunu erkenden sonlandırarak DOM ve betik yapısını bozar. (Mevcut kodda `replace(/<\/script/gi, '<\\/script')` ile önlem alınmıştır, korunmalıdır).
4. **`replace()` İçinde Özel Karakter (`$`) Riski:**
   * `scormPlayerHtml.replace('/* INJECT_COURSE_DATA */', string)` çağrısında eğer string içinde `$1`, `$&`, `$'` gibi semboller varsa (örneğin soruda dolar işareti `$100` yazılmışsa), `String.prototype.replace` bunu özel regex grubu sanır. (Mevcut kodda replacer fonksiyonu `() => courseDataContent` kullanılarak bu risk engellenmiştir, korunmalıdır).
5. **Geliştirme Ortamı Kısıtları:**
   * 900+ satırlık oynatıcı kodunun tek bir JS template string içinde durması linter, formatlayıcı (Prettier) ve IDE sözdizimi denetiminden mahrum kalmasına yol açmaktadır. Kodun `src/runtime/` altında bağımsız `.js` dosyalarına bölünmesi bu riski kökten çözecektir.
