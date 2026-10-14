import { saveAs } from 'file-saver'

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Verinin geçerli olup olmadığı
 * @property {string} [error] - Doğrulama başarısızsa Türkçe hata açıklaması
 * @property {Object} [data] - Doğrulanmış proje verisi
 */

const DB_NAME = 'StorylineLiteDB'
const DB_VERSION = 1
const STORE_NAME = 'projects'
const CURRENT_PROJECT_KEY = 'current_project'

/**
 * Çalışma ortamındaki IndexedDB nesnesini güvenle döndürür.
 * @returns {IDBFactory|null}
 */
function getIndexedDB() {
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB
  }
  if (typeof globalThis !== 'undefined' && globalThis.indexedDB) {
    return globalThis.indexedDB
  }
  if (typeof indexedDB !== 'undefined') {
    return indexedDB
  }
  return null
}

/**
 * IndexedDB veritabanı bağlantısını açar.
 * @returns {Promise<IDBDatabase>}
 */
export function openDatabase() {
  return new Promise((resolve, reject) => {
    const idb = getIndexedDB()
    if (!idb) {
      return reject(new Error('IndexedDB bu ortamda desteklenmiyor.'))
    }

    const request = idb.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = (event) => {
      resolve(event.target.result)
    }

    request.onerror = (event) => {
      reject(new Error(`IndexedDB açılamadı: ${event.target.error?.message || 'Bilinmeyen hata'}`))
    }
  })
}

/**
 * Proje verisini IndexedDB içine kaydeder.
 * @param {Object} projectData - Serileştirilmiş proje verisi
 * @returns {Promise<boolean>}
 */
export async function saveProjectToIndexedDB(projectData) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(projectData, CURRENT_PROJECT_KEY)

      request.onsuccess = () => resolve(true)
      request.onerror = (e) => reject(new Error(`Kayıt başarısız: ${e.target.error?.message || 'Bilinmeyen hata'}`))
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * IndexedDB içindeki son kaydedilmiş projeyi getirir.
 * @returns {Promise<Object|null>}
 */
export async function loadProjectFromIndexedDB() {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(CURRENT_PROJECT_KEY)

      request.onsuccess = () => {
        resolve(request.result || null)
      }
      request.onerror = (e) => reject(new Error(`Yükleme başarısız: ${e.target.error?.message || 'Bilinmeyen hata'}`))
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * IndexedDB üzerindeki kayıtlı projeyi siler/temizler.
 * @returns {Promise<boolean>}
 */
export async function clearProjectFromIndexedDB() {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(CURRENT_PROJECT_KEY)

      request.onsuccess = () => resolve(true)
      request.onerror = (e) => reject(new Error(`Temizleme başarısız: ${e.target.error?.message || 'Bilinmeyen hata'}`))
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * courseStore durumunu JSON formatına uygun, bağımsız bir nesneye dönüştürür (serileştirir).
 * Base64 görseller bu aşamada JSON içinde korunur.
 * @param {Object} store - Pinia ders deposu
 * @returns {Object} Serileştirilmiş proje verisi
 */
export function serializeProject(store) {
  return {
    schemaVersion: 1,
    courseTitle: store.courseTitle || 'Yeni E-Öğrenme Dersi',
    author: store.author || 'Eğitmen',
    activeSlideId: store.activeSlideId || (store.slides?.[0]?.id) || 'slide-1',
    slides: JSON.parse(JSON.stringify(store.slides || [])),
    updatedAt: new Date().toISOString()
  }
}

/**
 * Yüklenen veya açılan proje JSON verisinin geçerli ve eksiksiz bir yapıya sahip olduğunu doğrular.
 * @param {any} data - Doğrulanacak veri
 * @returns {ValidationResult}
 */
export function validateProjectData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      isValid: false,
      error: 'Geçersiz dosya formatı: Proje verisi geçerli bir JSON nesnesi olmalıdır.'
    }
  }

  if (typeof data.courseTitle !== 'string' || !data.courseTitle.trim()) {
    return {
      isValid: false,
      error: 'Geçersiz proje: Ders başlığı (courseTitle) metin tipinde ve dolu olmalıdır.'
    }
  }

  if (!Array.isArray(data.slides) || data.slides.length === 0) {
    return {
      isValid: false,
      error: 'Geçersiz proje yapısı: Projede en az bir slayt ("slides" dizisi) bulunmalıdır.'
    }
  }

  for (let i = 0; i < data.slides.length; i++) {
    const slide = data.slides[i]
    if (!slide || typeof slide !== 'object') {
      return {
        isValid: false,
        error: `Geçersiz slayt yapısı: Slayt #${i + 1} geçerli bir nesne değil.`
      }
    }

    if (!slide.id || typeof slide.id !== 'string') {
      return {
        isValid: false,
        error: `Geçersiz slayt: Slayt #${i + 1} için benzersiz "id" alanı zorunludur.`
      }
    }

    if (!['content', 'quiz'].includes(slide.type)) {
      return {
        isValid: false,
        error: `Geçersiz slayt tipi: Slayt #${i + 1} tipi "content" veya "quiz" olmalıdır. Alınan: "${slide.type}".`
      }
    }

    if (!Array.isArray(slide.elements)) {
      return {
        isValid: false,
        error: `Geçersiz eleman yapısı: Slayt #${i + 1} "elements" dizisi içermelidir.`
      }
    }

    if (slide.type === 'quiz') {
      if (!slide.quiz || typeof slide.quiz !== 'object') {
        return {
          isValid: false,
          error: `Geçersiz soru slaytı: Slayt #${i + 1} için "quiz" nesnesi zorunludur.`
        }
      }
      if (!Array.isArray(slide.quiz.options) || slide.quiz.options.length < 2) {
        return {
          isValid: false,
          error: `Geçersiz quiz yapısı: Slayt #${i + 1} sorusunda en az 2 seçenek bulunmalıdır.`
        }
      }
      if (!slide.quiz.correctAnswer) {
        return {
          isValid: false,
          error: `Geçersiz quiz yapısı: Slayt #${i + 1} için doğru cevap ("correctAnswer") belirlenmelidir.`
        }
      }
    }
  }

  return {
    isValid: true,
    data
  }
}

/**
 * courseStore üzerindeki değişiklikleri dinleyerek belirtilen debounce süresi (varsayılan 3 sn)
 * sonrasında IndexedDB'ye otomatik kaydeder.
 * @param {Object} store - Pinia courseStore nesnesi
 * @param {number} [debounceMs=3000] - Gecikme süresi (milisaniye)
 * @param {Function} [onSaveCallback] - Kayıt sonrası tetiklenecek fonksiyon
 * @param {Function} [saveFn=saveProjectToIndexedDB] - Kayıt fonksiyonu
 * @returns {Function} Teardown (abonelik ve zamanlayıcı iptal) fonksiyonu
 */
export function setupAutoSave(store, debounceMs = 3000, onSaveCallback = null, saveFn = saveProjectToIndexedDB) {
  let timer = null

  const unsubscribe = store.$subscribe(() => {
    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(async () => {
      try {
        const serialized = serializeProject(store)
        await saveFn(serialized)
        if (typeof onSaveCallback === 'function') {
          onSaveCallback(serialized)
        }
      } catch (err) {
        console.warn('[AutoSave Warning]: IndexedDB otomatik kayıt başarısız:', err)
      }
    }, debounceMs)
  })

  return () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (typeof unsubscribe === 'function') {
      unsubscribe()
    }
  }
}

/**
 * Projeyi JSON formatında dışa aktarır ve tarayıcıdan indirtir (project.json).
 * @param {Object} store - Pinia ders deposu
 * @param {string} [filename='project.json'] - İndirilecek dosya adı
 * @returns {Object} İndirilen serileştirilmiş proje nesnesi
 */
export function saveProjectToFile(store, filename = 'project.json') {
  const data = serializeProject(store)
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' })
  saveAs(blob, filename)
  return data
}

/**
 * Kullanıcının seçtiği JSON dosyasını okur, yapısını doğrular ve proje verisini döndürür.
 * Modern tarayıcılarda file.text(), eski ortamlarda FileReader kullanır.
 * @param {File|Blob} file - Okunacak dosya nesnesi
 * @returns {Promise<Object>} Doğrulanmış proje verisi
 */
export async function loadProjectFromFile(file) {
  if (!file) {
    throw new Error('Dosya seçilmedi.')
  }

  let text = ''
  try {
    if (typeof file.text === 'function') {
      text = await file.text()
    } else if (typeof FileReader !== 'undefined') {
      text = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Dosya okunamadı. Lütfen tekrar deneyin.'))
        reader.readAsText(file)
      })
    } else {
      throw new Error('Dosya okuyucu bu ortamda desteklenmiyor.')
    }
  } catch (err) {
    throw new Error('Dosya okunamadı. Lütfen tekrar deneyin.')
  }

  if (!text || typeof text !== 'string') {
    throw new Error('Dosya içeriği boş veya okunamadı.')
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    throw new Error('Geçersiz JSON dosyası: Dosya içeriği JSON formatında değil.')
  }

  const validation = validateProjectData(parsed)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  return validation.data
}
