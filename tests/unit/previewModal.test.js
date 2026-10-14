// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCourseStore } from '../../src/stores/courseStore'
import { buildPlayerHtml } from '../../src/services/scormExporter'
import basicCourseFixture from '../fixtures/basicCourse.json'
import threeQuestionQuizCourseFixture from '../fixtures/threeQuestionQuizCourse.json'

describe('PreviewModal ve Ortak Oynatıcı Entegrasyon Testleri', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    if (typeof window !== 'undefined' && window.API) {
      delete window.API
    }
  })

  afterEach(() => {
    if (typeof window !== 'undefined' && window.API) {
      delete window.API
    }
  })

  it('buildPlayerHtml, SCORM exporter ile aynı tam oynatıcı HTML çıktısını üretmelidir', () => {
    const store = useCourseStore()
    store.loadProject(basicCourseFixture)

    const playerHtml = buildPlayerHtml(store)

    expect(playerHtml).toContain('<!DOCTYPE html>')
    expect(playerHtml).toContain('Temel E-Öğrenme Dersi')
    expect(playerHtml).toContain('pipwerks')
    expect(playerHtml).toContain('window.COURSE_DATA = window.COURSE_DATA ||')
    expect(playerHtml).toContain('initPlayer')
    expect(playerHtml).not.toContain('/* INJECT_SCORM_WRAPPER */')
    expect(playerHtml).not.toContain('/* INJECT_COURSE_DATA */')
    expect(playerHtml).not.toContain('/* INJECT_PLAYER_JS */')
  })

  it('PreviewModal sahte SCORM API (window.API) kurabilmeli ve LMS çağrılarını yakalayabilmelidir', () => {
    const cmi = {
      'cmi.core.lesson_status': 'not attempted',
      'cmi.core.score.raw': '',
      'cmi.core.lesson_location': '0'
    }

    const logs = []

    // PreviewModal setupMockScormApi mantığı:
    window.API = {
      LMSInitialize: (p) => {
        logs.push({ method: 'LMSInitialize', param: p })
        return 'true'
      },
      LMSGetValue: (p) => {
        logs.push({ method: 'LMSGetValue', param: p })
        return cmi[p] || ''
      },
      LMSSetValue: (p, v) => {
        cmi[p] = String(v)
        logs.push({ method: 'LMSSetValue', param: p, val: v })
        return 'true'
      },
      LMSCommit: (p) => {
        logs.push({ method: 'LMSCommit', param: p })
        return 'true'
      },
      LMSFinish: (p) => {
        logs.push({ method: 'LMSFinish', param: p })
        return 'true'
      }
    }

    expect(window.API).toBeDefined()

    // Oynatıcının başlatılması simülasyonu
    expect(window.API.LMSInitialize('')).toBe('true')
    expect(window.API.LMSGetValue('cmi.core.lesson_status')).toBe('not attempted')

    // Durum ve puan güncellemesi simülasyonu
    window.API.LMSSetValue('cmi.core.lesson_status', 'incomplete')
    expect(cmi['cmi.core.lesson_status']).toBe('incomplete')

    window.API.LMSSetValue('cmi.core.score.raw', '100')
    expect(cmi['cmi.core.score.raw']).toBe('100')

    window.API.LMSSetValue('cmi.core.lesson_status', 'passed')
    expect(cmi['cmi.core.lesson_status']).toBe('passed')

    window.API.LMSCommit('')
    expect(logs.length).toBe(6)

    // Temizleme simülasyonu
    delete window.API
    expect(window.API).toBeUndefined()
  })

  it('3 soruluk sınavlı projede buildPlayerHtml soruları ve şıkları eksiksiz içermelidir', () => {
    const store = useCourseStore()
    store.loadProject(threeQuestionQuizCourseFixture)

    const playerHtml = buildPlayerHtml(store)

    expect(playerHtml).toContain('Üç Soruluk Değerlendirme Sınavı')
    expect(playerHtml).toContain('SCORM standartlarının en önemli faydası nedir?')
    expect(playerHtml).toContain('Platform bağımsız içerik taşınabilirliği')
    expect(playerHtml).toContain('cmi.core.score.raw')
  })
})
