import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { generateManifestXml } from './manifestGenerator'
import scormApiWrapperCode from '../runtime/scormWrapper.js?raw'
import playerJsCode from '../runtime/player.js?raw'
import playerTemplateHtml from '../runtime/playerTemplate.html?raw'

export function slugify(text) {
  const trMap = {
    'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U', 'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O'
  }
  return (text || 'E-Ogrenme_Dersi')
    .replace(/[çÇğĞşŞüÜıİöÖ]/g, match => trMap[match] || match)
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
}

/**
 * Ders verisi ve runtime kodlarını birleştirerek bağımsız index.html oynatıcı içeriğini üretir.
 * Hem SCORM exporter paketi hem de PreviewModal önizlemesi aynı fonksiyonu kullanır.
 * @param {Object} courseStore - Pinia ders deposu veya ders verisi nesnesi
 * @returns {string} Enjekte edilmiş bağımsız oynatıcı HTML içeriği
 */
export function buildPlayerHtml(courseStore) {
  const cleanSlides = JSON.parse(JSON.stringify(courseStore.slides || []))
  const courseData = {
    title: courseStore.courseTitle || 'E-Öğrenme Dersi',
    slides: cleanSlides
  }
  // Script kapanış etiketi XSS koruması
  const courseDataJson = JSON.stringify(courseData, null, 2).replace(/<\/script/gi, '<\\/script')
  const courseDataContent = `window.COURSE_DATA = window.COURSE_DATA || ${courseDataJson};`

  return playerTemplateHtml
    .replace('/* INJECT_SCORM_WRAPPER */', () => scormApiWrapperCode)
    .replace('/* INJECT_COURSE_DATA */', () => courseDataContent)
    .replace('/* INJECT_PLAYER_JS */', () => playerJsCode)
}

/**
 * SCORM 1.2 zip paketi için gerekli tüm dosyaları ve zip Blob'unu üretir.
 * @param {Object} courseStore - Pinia ders deposu veya ders verisi nesnesi
 * @returns {Promise<{ zip: JSZip, zipBlob: Blob, safeFilename: string, manifestXml: string, courseDataContent: string, injectedPlayerHtml: string }>}
 */
export async function buildZip(courseStore) {
  const zip = new JSZip()
  const rawTitle = courseStore.courseTitle || 'E-Ogrenme_Dersi'
  const safeFilename = slugify(rawTitle)

  // 1. Temiz ve Güvenli Ders Verisi (course-data.js)
  const cleanSlides = JSON.parse(JSON.stringify(courseStore.slides || []))
  const courseData = {
    title: courseStore.courseTitle || 'E-Öğrenme Dersi',
    slides: cleanSlides
  }
  // Script kapanış etiketi XSS koruması
  const courseDataJson = JSON.stringify(courseData, null, 2).replace(/<\/script/gi, '<\\/script')
  const courseDataContent = `window.COURSE_DATA = window.COURSE_DATA || ${courseDataJson};`
  zip.file('course-data.js', courseDataContent)

  // 2. Standart SCORM 1.2 Manifest (imsmanifest.xml)
  const hasQuizzes = cleanSlides.some(s => s.type === 'quiz')
  const manifestXml = generateManifestXml(courseStore.courseTitle, {
    hasQuizzes: hasQuizzes,
    masteryScore: 80
  })
  zip.file('imsmanifest.xml', manifestXml)

  // 3. SCORM API Wrapper
  zip.file('SCORM_API_wrapper.js', scormApiWrapperCode)

  // 4. Standalone Player (index.html) - Önizleme ve paket için tek merkezden üretilir
  const injectedPlayerHtml = buildPlayerHtml(courseStore)
  zip.file('index.html', injectedPlayerHtml)

  // 5. ZIP Arşivini Derle
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6
    }
  })

  return {
    zip,
    zipBlob,
    safeFilename,
    manifestXml,
    courseDataContent,
    injectedPlayerHtml
  }
}

/**
 * Mevcut ders durumunu SCORM 1.2 uyumlu .zip paketine dönüştürür ve indirir.
 * @param {Object} courseStore - Pinia ders deposu
 */
export async function exportToScormPackage(courseStore) {
  const { zipBlob, safeFilename } = await buildZip(courseStore)
  saveAs(zipBlob, `${safeFilename}_SCORM12.zip`)
}

