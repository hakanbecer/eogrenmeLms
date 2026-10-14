import { describe, it, expect } from 'vitest'
import { generateManifestXml } from '../../src/services/manifestGenerator'
import { JSDOM } from 'jsdom'

describe('manifestGenerator Regresyon Testleri', () => {
  it('isvisible="true" niteliği item etiketinde yer almalıdır', () => {
    const xml = generateManifestXml('Test Dersi')
    expect(xml).toContain('isvisible="true"')
    expect(xml).toMatch(/<item[^>]+isvisible="true"[^>]*>/)
  })

  it('gereksiz veya geçersiz namespace (imsmd vb.) içermemelidir', () => {
    const xml = generateManifestXml('Test Dersi')
    expect(xml).not.toContain('xmlns:imsmd')
    expect(xml).not.toContain('imsmd:')
    expect(xml).toContain('xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"')
    expect(xml).toContain('xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"')
    expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"')
  })

  it('üretilen çıktı geçerli ve hatasız bir XML olmalıdır', () => {
    const xml = generateManifestXml('İleri Seviye E-Öğrenme & Değerlendirme')
    const dom = new JSDOM('')
    const parser = new dom.window.DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')

    const parseError = doc.querySelector('parsererror')
    expect(parseError).toBeNull()

    const manifest = doc.querySelector('manifest')
    expect(manifest).not.toBeNull()
    expect(manifest.getAttribute('identifier')).toBeDefined()

    const resource = doc.querySelector('resource')
    expect(resource.getAttribute('adlcp:scormtype')).toBe('sco')
    expect(resource.getAttribute('href')).toBe('index.html')

    const files = Array.from(doc.querySelectorAll('file')).map(f => f.getAttribute('href'))
    expect(files).toContain('index.html')
    expect(files).toContain('SCORM_API_wrapper.js')
    expect(files).toContain('course-data.js')
  })

  describe('quiz varken ve yokken adlcp:masteryscore davranışı', () => {
    it('hasQuizzes: true olduğunda masteryscore varsayılan olarak 80 olmalıdır', () => {
      const xml = generateManifestXml('Sınavlı Ders', { hasQuizzes: true })
      expect(xml).toContain('<adlcp:masteryscore>80</adlcp:masteryscore>')
    })

    it('hasQuizzes: true ve özel masteryScore verildiğinde belirtilen skor yazılmalıdır', () => {
      const xml = generateManifestXml('Özel Skorlu Ders', { hasQuizzes: true, masteryScore: 75 })
      expect(xml).toContain('<adlcp:masteryscore>75</adlcp:masteryscore>')
    })

    it('hasQuizzes: false olduğunda adlcp:masteryscore etiketi bulunmamalıdır', () => {
      const xml = generateManifestXml('Sınavsız İçerik Dersi', { hasQuizzes: false })
      expect(xml).not.toContain('<adlcp:masteryscore>')
      expect(xml).not.toContain('masteryscore')
    })

    it('options belirtilmediğinde varsayılan hasQuizzes=true ve masteryScore=80 davranışı korunmalıdır', () => {
      const xml = generateManifestXml('Varsayılan Ders')
      expect(xml).toContain('<adlcp:masteryscore>80</adlcp:masteryscore>')
    })
  })

  it('başlık içindeki XML özel karakterleri (&, <, >, ", \') güvenle kaçırılmalıdır', () => {
    const xml = generateManifestXml('Ders & Quiz: "A" <B> \'C\'')
    expect(xml).toContain('Ders &amp; Quiz: &quot;A&quot; &lt;B&gt; &apos;C&apos;')
    const dom = new JSDOM('')
    const doc = new dom.window.DOMParser().parseFromString(xml, 'text/xml')
    expect(doc.querySelector('parsererror')).toBeNull()
  })
})
