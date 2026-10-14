import { describe, it, expect } from 'vitest'
import { slugify } from '../../src/services/scormExporter'

describe('slugify Regresyon Testleri', () => {
  it('Türkçe karakterleri birebir ASCII karşılıklarına dönüştürmelidir', () => {
    const input = 'çÇğĞşŞüÜıİöÖ'
    const expected = 'cCgGsSuUiIoO'
    expect(slugify(input)).toBe(expected)
  })

  it('Türkçe başlık içeren bir metni güvenli ASCII formatına getirmelidir', () => {
    const input = 'İş Sağlığı ve Güvenliği Eğitimi (Çalışanlar İçin)'
    const output = slugify(input)
    expect(output).toBe('Is_Sagligi_ve_Guvenligi_Egitimi_Calisanlar_Icin_')
    expect(output).toMatch(/^[a-zA-Z0-9_\-]+$/)
  })

  it('geçersiz dosya adı karakterlerini temizlemeli ve ardışık alt çizgileri teke indirmelidir', () => {
    const input = 'Modül / Bölüm 1: Giriş & Temeller *?<>|'
    const output = slugify(input)
    // Slaslar, iki nokta, yıldız, soru işareti vb. hepsi alt çizgiye dönüşmeli ve birleştirilmeli
    expect(output).toBe('Modul_Bolum_1_Giris_Temeller_')
    expect(output).not.toContain('__')
    expect(output).not.toMatch(/[\/\\:*?"<>|&]/)
  })

  it('boş, tanımsız veya null değer verildiğinde varsayılan E-Ogrenme_Dersi değerini döndürmelidir', () => {
    expect(slugify('')).toBe('E-Ogrenme_Dersi')
    expect(slugify(null)).toBe('E-Ogrenme_Dersi')
    expect(slugify(undefined)).toBe('E-Ogrenme_Dersi')
  })

  it('_SCORM12.zip soneki eklendiğinde geçerli ve güvenli zip dosya adı üretmelidir', () => {
    const rawTitle = 'Türkçe Çözümler & Eğitim Seti v1.0'
    const safeZipName = `${slugify(rawTitle)}_SCORM12.zip`
    expect(safeZipName).toBe('Turkce_Cozumler_Egitim_Seti_v1_0_SCORM12.zip')
    expect(safeZipName.endsWith('_SCORM12.zip')).toBe(true)
    // Güvenli dosya adı karakterleri dışında karakter içermemeli
    expect(safeZipName).toMatch(/^[a-zA-Z0-9_\-.]+\.zip$/)
  })
})
