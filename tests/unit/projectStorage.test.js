import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCourseStore } from '../../src/stores/courseStore'
import {
  serializeProject,
  validateProjectData,
  saveProjectToIndexedDB,
  loadProjectFromIndexedDB,
  clearProjectFromIndexedDB,
  setupAutoSave,
  saveProjectToFile,
  loadProjectFromFile
} from '../../src/services/projectStorage'
import basicCourseFixture from '../fixtures/basicCourse.json'
import threeQuestionQuizCourseFixture from '../fixtures/threeQuestionQuizCourse.json'

describe('projectStorage Birim ve Entegrasyon Testleri', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await clearProjectFromIndexedDB().catch(() => {})
  })

  afterEach(async () => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    await clearProjectFromIndexedDB().catch(() => {})
  })

  describe('Serileştirme (serializeProject)', () => {
    it('courseStore durumunu şema versiyonu ve tüm alanlarıyla serileştirmelidir', () => {
      const store = useCourseStore()
      store.courseTitle = 'Test Eğitimi'
      store.author = 'Ahmet Hoca'

      const serialized = serializeProject(store)

      expect(serialized.schemaVersion).toBe(1)
      expect(serialized.courseTitle).toBe('Test Eğitimi')
      expect(serialized.author).toBe('Ahmet Hoca')
      expect(serialized.activeSlideId).toBe(store.activeSlideId)
      expect(Array.isArray(serialized.slides)).toBe(true)
      expect(serialized.slides.length).toBe(store.slides.length)
      expect(serialized.updatedAt).toBeDefined()
    })

    it('store içindeki base64 görselleri JSON içinde kayıpsız korumalıdır', () => {
      const store = useCourseStore()
      const base64Sample = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      store.slides[0].elements.push({
        id: 'elem-img',
        type: 'image',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        src: base64Sample
      })

      const serialized = serializeProject(store)
      const imgElem = serialized.slides[0].elements.find(e => e.id === 'elem-img')

      expect(imgElem).toBeDefined()
      expect(imgElem.src).toBe(base64Sample)
    })

    it('serileştirilen nesne store referansından bağımsız derin kopya (deep clone) olmalıdır', () => {
      const store = useCourseStore()
      const serialized = serializeProject(store)

      // Store üzerinde sonradan yapılan değişiklik serileştirilmiş nesneyi etkilememelidir
      store.slides[0].title = 'Değiştirilen Başlık'
      expect(serialized.slides[0].title).not.toBe('Değiştirilen Başlık')
    })
  })

  describe('Şema Doğrulama (validateProjectData)', () => {
    it('geçerli test fixture projelerini hatasız onaylamalıdır', () => {
      expect(validateProjectData(basicCourseFixture).isValid).toBe(true)
      expect(validateProjectData(threeQuestionQuizCourseFixture).isValid).toBe(true)
    })

    it('nesne olmayan veya null verilerde Türkçe hata açıklaması döndürmelidir', () => {
      const resNull = validateProjectData(null)
      expect(resNull.isValid).toBe(false)
      expect(resNull.error).toContain('Geçersiz dosya formatı')

      const resArray = validateProjectData([])
      expect(resArray.isValid).toBe(false)
      expect(resArray.error).toContain('Geçersiz dosya formatı')

      const resString = validateProjectData('metin')
      expect(resString.isValid).toBe(false)
      expect(resString.error).toContain('Geçersiz dosya formatı')
    })

    it('ders başlığı (courseTitle) eksik veya boş olduğunda Türkçe hata vermelidir', () => {
      const invalid = { ...basicCourseFixture, courseTitle: '' }
      const res = validateProjectData(invalid)
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('Ders başlığı')
    })

    it('slayt listesi (slides) boş veya eksik olduğunda Türkçe hata vermelidir', () => {
      const invalid = { ...basicCourseFixture, slides: [] }
      const res = validateProjectData(invalid)
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('en az bir slayt')
    })

    it('slayt id veya type alanı eksik olduğunda Türkçe hata vermelidir', () => {
      const invalidId = {
        courseTitle: 'Başlık',
        slides: [{ type: 'content', elements: [] }]
      }
      const resId = validateProjectData(invalidId)
      expect(resId.isValid).toBe(false)
      expect(resId.error).toContain('id')

      const invalidType = {
        courseTitle: 'Başlık',
        slides: [{ id: 's1', type: 'video_unsupported', elements: [] }]
      }
      const resType = validateProjectData(invalidType)
      expect(resType.isValid).toBe(false)
      expect(resType.error).toContain('tipi "content" veya "quiz" olmalıdır')
    })

    it('quiz slaytında quiz nesnesi veya seçenekleri eksikse Türkçe hata vermelidir', () => {
      const invalidQuiz = {
        courseTitle: 'Başlık',
        slides: [
          {
            id: 's-quiz',
            type: 'quiz',
            elements: [],
            quiz: {
              question: 'Soru?',
              options: [{ id: 'A', text: 'Tek seçenek' }], // En az 2 seçenek gerekir
              correctAnswer: 'A'
            }
          }
        ]
      }
      const res = validateProjectData(invalidQuiz)
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('en az 2 seçenek')
    })
  })

  describe('IndexedDB CRUD İşlemleri', () => {
    it('projeyi IndexedDB içine kaydedip birebir aynı şekilde geri yükleyebilmelidir', async () => {
      const store = useCourseStore()
      store.courseTitle = 'IndexedDB Test Dersi'
      const projectData = serializeProject(store)

      await saveProjectToIndexedDB(projectData)
      const loaded = await loadProjectFromIndexedDB()

      expect(loaded).toBeDefined()
      expect(loaded.courseTitle).toBe('IndexedDB Test Dersi')
      expect(loaded.slides.length).toBe(store.slides.length)
      expect(loaded.slides[0].id).toBe(store.slides[0].id)
    })

    it('clearProjectFromIndexedDB çağrıldığında kayıtlı proje silinmelidir', async () => {
      const store = useCourseStore()
      await saveProjectToIndexedDB(serializeProject(store))

      const loadedBefore = await loadProjectFromIndexedDB()
      expect(loadedBefore).not.toBeNull()

      await clearProjectFromIndexedDB()
      const loadedAfter = await loadProjectFromIndexedDB()
      expect(loadedAfter).toBeNull()
    })
  })

  describe('3 Saniye Debounce ile Otomatik Kayıt (setupAutoSave)', () => {
    it('store her değiştiğinde hemen değil, 3 saniye sonra kaydetmelidir', async () => {
      vi.useFakeTimers()
      const store = useCourseStore()

      let savedData = null
      let saveCount = 0
      const mockSaveFn = vi.fn().mockImplementation(async (data) => {
        savedData = data
        saveCount++
        return true
      })

      const stop = setupAutoSave(store, 3000, () => {}, mockSaveFn)

      // 1. Değişiklik: başlığı değiştir
      store.courseTitle = 'Otomatik Kayıt Dersi'

      // 1000ms sonra henüz kayıt tetiklenmemiş olmalı
      await vi.advanceTimersByTimeAsync(1000)
      expect(saveCount).toBe(0)

      // 2. Değişiklik: yeni slayt ekle (debounce sıfırlanır)
      store.addSlide('content')

      // Bir 2000ms daha geçsin (2. değişiklikten sonra sadece 2000ms geçti)
      await vi.advanceTimersByTimeAsync(2000)
      expect(saveCount).toBe(0)

      // 1000ms daha geçsin (2. değişiklikten sonra 3000ms doldu)
      await vi.advanceTimersByTimeAsync(1000)
      expect(saveCount).toBe(1)
      expect(savedData.courseTitle).toBe('Otomatik Kayıt Dersi')
      expect(savedData.slides.length).toBe(2)

      stop()
      vi.useRealTimers()
    })

    it('teardown fonksiyonu çağrıldığında bekleyen zamanlayıcı iptal edilmelidir', async () => {
      vi.useFakeTimers()
      const store = useCourseStore()

      let saveCount = 0
      const mockSaveFn = vi.fn().mockImplementation(async () => {
        saveCount++
        return true
      })

      const stop = setupAutoSave(store, 3000, () => {}, mockSaveFn)

      store.courseTitle = 'İptal Edilecek Kayıt'
      stop() // Hemen durdur

      await vi.advanceTimersByTimeAsync(3500)
      expect(saveCount).toBe(0)

      vi.useRealTimers()
    })

    it('gerçek zamanlayıcı ile IndexedDB entegrasyonunda otomatik kayıt başarılı olmalıdır', async () => {
      const store = useCourseStore()
      store.courseTitle = 'Gerçek DB Kayıt Dersi'

      let onSaveCalled = false
      const stop = setupAutoSave(store, 50, () => {
        onSaveCalled = true
      })

      // Store üzerinde değişiklik yap
      store.author = 'Yeni Yazar'

      // 120ms bekle (50ms debounce'un dolması için)
      await new Promise(r => setTimeout(r, 120))

      expect(onSaveCalled).toBe(true)

      const fromDb = await loadProjectFromIndexedDB()
      expect(fromDb).not.toBeNull()
      expect(fromDb.courseTitle).toBe('Gerçek DB Kayıt Dersi')
      expect(fromDb.author).toBe('Yeni Yazar')

      stop()
    })
  })

  describe('Dosyadan Proje Yükleme ve Doğrulama (loadProjectFromFile)', () => {
    it('geçerli bir JSON dosyasını okuyup doğrulanmış veriyi döndürmelidir', async () => {
      const jsonStr = JSON.stringify(basicCourseFixture)
      const blob = new Blob([jsonStr], { type: 'application/json' })

      const loaded = await loadProjectFromFile(blob)
      expect(loaded.courseTitle).toBe(basicCourseFixture.courseTitle)
      expect(loaded.slides.length).toBe(basicCourseFixture.slides.length)
    })

    it('bozuk JSON formatında dosya verildiğinde Türkçe hata fırlatmalıdır', async () => {
      const brokenBlob = new Blob(['{ bu bir json degildir '], { type: 'application/json' })

      await expect(loadProjectFromFile(brokenBlob)).rejects.toThrow('Geçersiz JSON dosyası')
    })

    it('geçersiz şemaya sahip bir JSON dosyası verildiğinde doğrulama hatası fırlatmalıdır', async () => {
      const invalidJsonStr = JSON.stringify({ randomField: 123 })
      const invalidBlob = new Blob([invalidJsonStr], { type: 'application/json' })

      await expect(loadProjectFromFile(invalidBlob)).rejects.toThrow('Ders başlığı')
    })
  })

  describe('Kabul Kriterleri: F5 Yenileme ve Kaydet -> Aç Birebir Eşleşme', () => {
    it('kaydet -> aç döngüsü sonrasında tüm proje durumu birebir aynı kalmalıdır', () => {
      const store1 = useCourseStore()
      store1.loadProject(threeQuestionQuizCourseFixture)

      // Projeyi serileştir (kaydet)
      const exportedJson = serializeProject(store1)

      // İkinci bir store'a geri yükle (aç)
      const store2 = useCourseStore()
      store2.resetProject()
      expect(store2.slides.length).toBe(1) // reset sonrası varsayılan 1 slayt

      store2.loadProject(exportedJson)

      // Karşılaştır
      expect(store2.courseTitle).toBe(store1.courseTitle)
      expect(store2.author).toBe(store1.author)
      expect(store2.slides.length).toBe(store1.slides.length)
      expect(JSON.stringify(store2.slides)).toBe(JSON.stringify(store1.slides))
    })

    it('F5 senaryosu: IndexedDB üzerindeki son durum store açılışında eksiksiz geri yüklenir', async () => {
      const initialStore = useCourseStore()
      initialStore.courseTitle = 'F5 Kurtarma Dersi'
      initialStore.addSlide('quiz')
      initialStore.activeSlide.quiz.question = 'F5 sonrası buradayım mı?'

      // IndexedDB'ye otomatik kaydedildiğini simüle et
      await saveProjectToIndexedDB(serializeProject(initialStore))

      // Sayfa yenilendi (yeni temiz bir store açıldı)
      const reloadedStore = useCourseStore()
      reloadedStore.resetProject()
      expect(reloadedStore.courseTitle).toBe('Yeni E-Öğrenme Dersi')

      // App.vue mounted mantığı:
      const savedData = await loadProjectFromIndexedDB()
      expect(savedData).not.toBeNull()

      const validation = validateProjectData(savedData)
      expect(validation.isValid).toBe(true)

      reloadedStore.loadProject(savedData)

      expect(reloadedStore.courseTitle).toBe('F5 Kurtarma Dersi')
      expect(reloadedStore.slides.length).toBe(2)
      expect(reloadedStore.slides[1].quiz.question).toBe('F5 sonrası buradayım mı?')
    })

    it('Yeni Proje senaryosu: resetProject çağrıldığında varsayılan başlangıç durumuna döner', () => {
      const store = useCourseStore()
      store.loadProject(threeQuestionQuizCourseFixture)
      expect(store.slides.length).toBe(3)

      store.resetProject()

      expect(store.courseTitle).toBe('Yeni E-Öğrenme Dersi')
      expect(store.author).toBe('Eğitmen')
      expect(store.slides.length).toBe(1)
      expect(store.slides[0].type).toBe('content')
      expect(store.slides[0].title).toBe('Giriş Slaytı')
    })
  })
})
