import { describe, it, expect } from 'vitest'
import { buildZip } from '../../src/services/scormExporter'
import basicCourseFixture from '../fixtures/basicCourse.json'
import threeQuestionQuizCourseFixture from '../fixtures/threeQuestionQuizCourse.json'

describe('scormExporter Regresyon Testleri', () => {
  it('zip arşivi gerekli 4 temel SCORM dosyasını eksiksiz içermelidir', async () => {
    const result = await buildZip(basicCourseFixture)
    const { zip, zipBlob, safeFilename } = result

    expect(zip).toBeDefined()
    expect(zipBlob).toBeDefined()
    expect(safeFilename).toBe('Temel_E-Ogrenme_Dersi')

    const fileNames = Object.keys(zip.files)
    expect(fileNames).toContain('index.html')
    expect(fileNames).toContain('imsmanifest.xml')
    expect(fileNames).toContain('SCORM_API_wrapper.js')
    expect(fileNames).toContain('course-data.js')
    expect(fileNames.length).toBe(4)
  })

  it('zip içindeki dosyalar beklenen geçerli içeriklere sahip olmalıdır', async () => {
    const { zip } = await buildZip(threeQuestionQuizCourseFixture)

    // 1. imsmanifest.xml
    const manifestContent = await zip.file('imsmanifest.xml').async('string')
    expect(manifestContent).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(manifestContent).toContain('Üç Soruluk Değerlendirme Sınavı')
    expect(manifestContent).toContain('<adlcp:masteryscore>80</adlcp:masteryscore>')

    // 2. SCORM_API_wrapper.js
    const wrapperContent = await zip.file('SCORM_API_wrapper.js').async('string')
    expect(wrapperContent).toContain('pipwerks')
    expect(wrapperContent).toContain('LMSInitialize')
    expect(wrapperContent).toContain('LMSSetValue')

    // 3. course-data.js
    const courseDataContent = await zip.file('course-data.js').async('string')
    expect(courseDataContent).toContain('window.COURSE_DATA = window.COURSE_DATA ||')
    expect(courseDataContent).toContain('Üç Soruluk Değerlendirme Sınavı')
    expect(courseDataContent).toContain('SCORM standartlarının en önemli faydası nedir?')

    // 4. index.html
    const indexHtmlContent = await zip.file('index.html').async('string')
    expect(indexHtmlContent).toContain('<!DOCTYPE html>')
    expect(indexHtmlContent).toContain('initPlayer')
    expect(indexHtmlContent).toContain('pipwerks')
    expect(indexHtmlContent).not.toContain('/* INJECT_SCORM_WRAPPER */')
    expect(indexHtmlContent).not.toContain('/* INJECT_COURSE_DATA */')
  })

  it('quiz olmayan derste imsmanifest.xml içinde masteryscore yer almamalıdır', async () => {
    const { zip } = await buildZip(basicCourseFixture)
    const manifestContent = await zip.file('imsmanifest.xml').async('string')
    expect(manifestContent).not.toContain('masteryscore')
  })
})
