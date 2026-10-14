import { describe, it, expect } from 'vitest'
import { buildZip } from '../../src/services/scormExporter'
import threeQuestionQuizCourseFixture from '../fixtures/threeQuestionQuizCourse.json'
import { JSDOM } from 'jsdom'

/**
 * Sahte SCORM 1.2 LMS API oluşturucu
 */
function createMockScormApi(initialCmi = {}) {
  const cmi = {
    'cmi.core.lesson_status': 'not attempted',
    'cmi.core.lesson_location': '0',
    'cmi.core.score.raw': '',
    'cmi.core.score.min': '',
    'cmi.core.score.max': '',
    ...initialCmi
  }

  const calls = []

  return {
    cmi,
    calls,
    LMSInitialize: (param) => {
      calls.push({ method: 'LMSInitialize', param })
      return 'true'
    },
    LMSGetValue: (param) => {
      calls.push({ method: 'LMSGetValue', param })
      return cmi[param] !== undefined ? String(cmi[param]) : ''
    },
    LMSSetValue: (param, val) => {
      calls.push({ method: 'LMSSetValue', param, val })
      cmi[param] = String(val)
      return 'true'
    },
    LMSCommit: (param) => {
      calls.push({ method: 'LMSCommit', param })
      return 'true'
    },
    LMSFinish: (param) => {
      calls.push({ method: 'LMSFinish', param })
      return 'true'
    },
    LMSGetLastError: () => '0',
    LMSGetErrorString: () => 'No error',
    LMSGetDiagnostic: () => ''
  }
}

/**
 * HTML'i sahte SCORM API ile JSDOM'a yükleme yardımcısı
 */
function loadPlayerInJsdom(html, mockApi) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    beforeParse(window) {
      window.API = mockApi
      window.alert = () => {} // Alert pencerelerini sustur

      // JSDOM ortamında innerText özelliğini textContent ile eşle
      Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
        get() {
          return this.textContent
        },
        set(value) {
          this.textContent = value
        },
        configurable: true
      })
    }
  })

  // JSDOM ortamında initPlayer otomatik tetiklenmemişse güvenle tetikle
  if (typeof dom.window.initPlayer === 'function') {
    dom.window.initPlayer()
  }

  return dom
}

/**
 * Aktif soru slaytında belirli bir şıkkı seçip 'Cevapla' butonuna tıklar
 */
function answerCurrentQuestion(dom, optionKey) {
  const document = dom.window.document
  const optionItems = Array.from(document.querySelectorAll('.player-opt-item'))
  const targetOption = optionItems.find(item => {
    const keyElem = item.querySelector('.player-opt-key')
    return keyElem && keyElem.textContent.trim() === optionKey
  })

  if (!targetOption) {
    throw new Error(`Şık bulunamadı: ${optionKey}`)
  }

  // Şıkkı tıkla
  targetOption.click()

  // Cevapla butonunu bul ve tıkla
  const submitBtn = document.querySelector('.player-btn-submit')
  if (!submitBtn) {
    throw new Error('Cevapla butonu bulunamadı!')
  }
  submitBtn.click()
}

/**
 * Sonraki slayta veya 'Dersi Bitir' butonuna tıklar
 */
function clickNextSlide(dom) {
  const nextBtn = dom.window.document.getElementById('nextBtn')
  if (!nextBtn) throw new Error('#nextBtn bulunamadı')
  nextBtn.click()
}

describe('SCORM Oynatıcı Runtime ve LMS Senkronizasyon Regresyon Testleri', () => {
  it('tek soruluk projede: doğru cevap verildiğinde score.raw=100 ve status=passed olmalıdır', async () => {
    const singleQuizCourse = {
      courseTitle: 'Tek Soruluk Test',
      slides: [
        {
          id: 'slide-single-1',
          type: 'quiz',
          title: 'Soru 1',
          quiz: {
            question: 'Tek soru testi?',
            options: [
              { id: 'A', text: 'Doğru Seçenek' },
              { id: 'B', text: 'Yanlış Seçenek' }
            ],
            correctAnswer: 'A',
            points: 100
          }
        }
      ]
    }

    const { injectedPlayerHtml } = await buildZip(singleQuizCourse)
    const mockApi = createMockScormApi()
    const dom = loadPlayerInJsdom(injectedPlayerHtml, mockApi)

    // Başlangıçta status incomplete olmalı
    expect(mockApi.cmi['cmi.core.lesson_status']).toBe('incomplete')

    // Doğru cevap olan 'A' şıkkını işaretle ve cevapla
    answerCurrentQuestion(dom, 'A')

    expect(mockApi.cmi['cmi.core.score.raw']).toBe('100')
    expect(mockApi.cmi['cmi.core.lesson_status']).toBe('passed')
  })

  it('tek soruluk projede: yanlış cevap verildiğinde score.raw=0 ve status=failed olmalıdır', async () => {
    const singleQuizCourse = {
      courseTitle: 'Tek Soruluk Test',
      slides: [
        {
          id: 'slide-single-1',
          type: 'quiz',
          title: 'Soru 1',
          quiz: {
            question: 'Tek soru testi?',
            options: [
              { id: 'A', text: 'Doğru Seçenek' },
              { id: 'B', text: 'Yanlış Seçenek' }
            ],
            correctAnswer: 'A',
            points: 100
          }
        }
      ]
    }

    const { injectedPlayerHtml } = await buildZip(singleQuizCourse)
    const mockApi = createMockScormApi()
    const dom = loadPlayerInJsdom(injectedPlayerHtml, mockApi)

    // Yanlış cevap olan 'B' şıkkını işaretle ve cevapla
    answerCurrentQuestion(dom, 'B')

    expect(mockApi.cmi['cmi.core.score.raw']).toBe('0')
    expect(mockApi.cmi['cmi.core.lesson_status']).toBe('failed')
  })

  it('3 soruluk sınavda: ilk sorular yanlış yapılsa bile sınav bitmeden failed olmamalı, incomplete kalmalıdır', async () => {
    const { injectedPlayerHtml } = await buildZip(threeQuestionQuizCourseFixture)
    const mockApi = createMockScormApi()
    const dom = loadPlayerInJsdom(injectedPlayerHtml, mockApi)

    // 1. Soru (Doğru cevap A): Yanlış cevap ver ('B')
    answerCurrentQuestion(dom, 'B')

    // Sınavın sadece 1 sorusu cevaplandığı için durum kesinlikle 'incomplete' olmalı, 'failed' olmamalıdır!
    expect(mockApi.cmi['cmi.core.score.raw']).toBe('0')
    expect(mockApi.cmi['cmi.core.lesson_status']).toBe('incomplete')

    // 2. Soruya geç
    clickNextSlide(dom)

    // 2. Soru (Doğru cevap B): Doğru cevap ver ('B')
    answerCurrentQuestion(dom, 'B')

    // 2 soru cevaplandı: 1 doğru, 1 yanlış (Puan: 100/300 = %33)
    // Sınav henüz bitmediği için durum hâlâ 'incomplete' kalmalıdır!
    expect(mockApi.cmi['cmi.core.score.raw']).toBe('33')
    expect(mockApi.cmi['cmi.core.lesson_status']).toBe('incomplete')
  })

  it('3 soruluk sınavda bitişte: %80 barajının altında kalınırsa failed, cmi.core.score.raw doğru değer olmalıdır', async () => {
    const { injectedPlayerHtml } = await buildZip(threeQuestionQuizCourseFixture)
    const mockApi = createMockScormApi()
    const dom = loadPlayerInJsdom(injectedPlayerHtml, mockApi)

    // 1. Soru: Doğru ('A') -> 100 puan
    answerCurrentQuestion(dom, 'A')
    expect(mockApi.cmi['cmi.core.lesson_status']).toBe('incomplete')

    // 2. Soru: Doğru ('B') -> 100 puan
    clickNextSlide(dom)
    answerCurrentQuestion(dom, 'B')
    expect(mockApi.cmi['cmi.core.lesson_status']).toBe('incomplete')

    // 3. Soru: Yanlış ('A', doğru cevap 'C') -> 0 puan
    clickNextSlide(dom)
    answerCurrentQuestion(dom, 'A')

    // Toplam: 200 / 300 = %67. Sabit geçme barajı %80 olduğu için sonuç 'failed' olmalıdır.
    expect(mockApi.cmi['cmi.core.score.raw']).toBe('67')
    expect(mockApi.cmi['cmi.core.lesson_status']).toBe('failed')
  })

  it('3 soruluk sınavda bitişte: %80 ve üzeri alındığında passed olmalıdır', async () => {
    const { injectedPlayerHtml } = await buildZip(threeQuestionQuizCourseFixture)
    const mockApi = createMockScormApi()
    const dom = loadPlayerInJsdom(injectedPlayerHtml, mockApi)

    // 1. Soru: Doğru ('A')
    answerCurrentQuestion(dom, 'A')

    // 2. Soru: Doğru ('B')
    clickNextSlide(dom)
    answerCurrentQuestion(dom, 'B')

    // 3. Soru: Doğru ('C')
    clickNextSlide(dom)
    answerCurrentQuestion(dom, 'C')

    // Toplam: 300 / 300 = %100 >= 80 -> passed
    expect(mockApi.cmi['cmi.core.score.raw']).toBe('100')
    expect(mockApi.cmi['cmi.core.lesson_status']).toBe('passed')
  })

  it('ders bitir (nextSlide son adım) tıklandığında LMSCommit çağrılmalı ve durum kaydedilmelidir', async () => {
    const { injectedPlayerHtml } = await buildZip(threeQuestionQuizCourseFixture)
    const mockApi = createMockScormApi()
    const dom = loadPlayerInJsdom(injectedPlayerHtml, mockApi)

    // Tüm soruları doğru cevapla ve son slaytta Dersi Bitir'e tıkla
    answerCurrentQuestion(dom, 'A')
    clickNextSlide(dom)
    answerCurrentQuestion(dom, 'B')
    clickNextSlide(dom)
    answerCurrentQuestion(dom, 'C')

    // 3. slayttayken nextBtn metni "Dersi Bitir ✓" olur
    const nextBtn = dom.window.document.getElementById('nextBtn')
    expect(nextBtn.textContent).toContain('Dersi Bitir')
    clickNextSlide(dom)

    const commitCalls = mockApi.calls.filter(c => c.method === 'LMSCommit')
    expect(commitCalls.length).toBeGreaterThan(0)
    expect(mockApi.cmi['cmi.core.lesson_status']).toBe('passed')
  })
})
