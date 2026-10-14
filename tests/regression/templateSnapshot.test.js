import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildZip } from '../../src/services/scormExporter'
import { scormApiWrapperCode } from '../../src/services/scormWrapperTemplate'
import basicCourseFixture from '../fixtures/basicCourse.json'
import threeQuestionQuizCourseFixture from '../fixtures/threeQuestionQuizCourse.json'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const snapshotsDir = path.resolve(__dirname, '../snapshots')

const basicHtmlPath = path.join(snapshotsDir, 'basicCourse_index.html')
const quizHtmlPath = path.join(snapshotsDir, 'threeQuestionQuizCourse_index.html')
const wrapperJsPath = path.join(snapshotsDir, 'SCORM_API_wrapper.js')

describe('Template Snapshot Karşılaştırma Testleri (Adım A & Adım B)', () => {
  it('basit proje için üretilen index.html snapshot ile karakteri karakterine birebir aynı olmalıdır', async () => {
    const { injectedPlayerHtml } = await buildZip(basicCourseFixture)
    const expectedHtml = fs.readFileSync(basicHtmlPath, 'utf8')
    expect(injectedPlayerHtml).toBe(expectedHtml)
  })

  it('3 soruluk sınavlı proje için üretilen index.html snapshot ile birebir aynı olmalıdır', async () => {
    const { injectedPlayerHtml } = await buildZip(threeQuestionQuizCourseFixture)
    const expectedHtml = fs.readFileSync(quizHtmlPath, 'utf8')
    expect(injectedPlayerHtml).toBe(expectedHtml)
  })

  it('üretilen SCORM_API_wrapper.js snapshot ile birebir aynı olmalıdır', async () => {
    const { zip } = await buildZip(basicCourseFixture)
    const currentWrapper = await zip.file('SCORM_API_wrapper.js').async('string')
    const expectedWrapper = fs.readFileSync(wrapperJsPath, 'utf8')
    expect(currentWrapper).toBe(expectedWrapper)
  })

  it('scormApiWrapperCode dışa aktarımı snapshot ile birebir aynı olmalıdır', () => {
    const expectedWrapper = fs.readFileSync(wrapperJsPath, 'utf8')
    expect(scormApiWrapperCode).toBe(expectedWrapper)
  })
})
