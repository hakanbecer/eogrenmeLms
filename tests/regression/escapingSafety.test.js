import { describe, it, expect } from 'vitest'
import { buildZip } from '../../src/services/scormExporter'
import securityEscapingCourseFixture from '../fixtures/securityEscapingCourse.json'
import { JSDOM } from 'jsdom'

describe('Kaçış ve Özel Karakter Güvenlik Testleri (escapingSafety)', () => {
  it('soru metninde "</script>" bulunması durumunda index.html betik bloğu erken kapanmamalıdır', async () => {
    const { injectedPlayerHtml, courseDataContent } = await buildZip(securityEscapingCourseFixture)

    // courseDataContent içinde ham </script yerine <\/script kaçışı yapılmış olmalıdır
    expect(courseDataContent).toContain('<\\/script')
    expect(courseDataContent).not.toMatch(/<\s*\/\s*script>/i)

    // index.html içinde COURSE_DATA script bloğunun erken kapanmadığını ve sağlam kaldığını doğrula
    const scriptBlocks = injectedPlayerHtml.split('</script>')
    // Sayfada en az 4 script bloğu bulunmalı, rastgele parça bölünmesi olmamalı
    expect(scriptBlocks.length).toBeGreaterThanOrEqual(4)
  })

  it('özel replacer sembolleri ($100, $&, $\', $`) String.prototype.replace tarafından yutulmamalı veya bozulmamalıdır', async () => {
    const { injectedPlayerHtml } = await buildZip(securityEscapingCourseFixture)

    // $100, $&, $' ve $` karakterlerinin aynen korunduğunu doğrula
    expect(injectedPlayerHtml).toContain('$100')
    expect(injectedPlayerHtml).toContain('$&')
    expect(injectedPlayerHtml).toContain('$\'')
    expect(injectedPlayerHtml).toContain('$`')

    // $& replacer nedeniyle /* INJECT_COURSE_DATA */ metninin tekrarlanarak içeriğe sızmadığını doğrula
    expect(injectedPlayerHtml).not.toContain('/* INJECT_COURSE_DATA */')
    expect(injectedPlayerHtml).not.toContain('/* INJECT_SCORM_WRAPPER */')
  })

  it('üretilen index.html jsdom içinde çalıştırıldığında COURSE_DATA verisi eksiksiz ve birebir okunabilmelidir', async () => {
    const { injectedPlayerHtml } = await buildZip(securityEscapingCourseFixture)

    const dom = new JSDOM(injectedPlayerHtml, {
      runScripts: 'dangerously',
      resources: 'usable'
    })

    const courseData = dom.window.COURSE_DATA
    expect(courseData).toBeDefined()
    expect(courseData.title).toBe('Güvenlik & Kaçış Testi $100 </script>')

    const slide1 = courseData.slides[0]
    expect(slide1.elements[0].text).toBe("Fiyat: $100 ve özel replacer deseni: $& ve $' ve $` </script>")

    const slide2 = courseData.slides[1]
    expect(slide2.quiz.question).toContain('Aşağıdaki fiyattan hangisi geçerlidir: $100 mi yoksa $& özel etiketi mi? </script><script>window.XSS=true</script>')
    expect(slide2.quiz.options[0].text).toBe('Ürün ücreti: $100 & indirimli </script>')
    expect(slide2.quiz.options[1].text).toBe('Replacer deseni: $& ve $1 </script>')

    // İçerikteki </script><script>window.XSS=true</script> tarayıcı tarafından inline HTML tag olarak ayrıştırılıp çalışmamalıdır
    expect(dom.window.XSS).toBeUndefined()
  })
})
