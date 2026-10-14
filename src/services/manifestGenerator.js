/**
 * SCORM 1.2 Uyumlu imsmanifest.xml Oluşturucu
 * EBA, Moodle, Canvas, SCORM Cloud ve tüm SCORM 1.2 uyumlu LMS sistemleri ile tam uyumludur.
 */
export function generateManifestXml(courseTitle, options = {}) {
  const safeTitle = escapeXml(courseTitle || 'E-Öğrenme Dersi')
  const timestamp = Date.now()
  const courseIdentifier = options.courseId || `COURSE_${timestamp}`
  const itemIdentifier = `ITEM_${timestamp}`
  const resourceIdentifier = `RES_${timestamp}`
  const hasQuizzes = (options.hasQuizzes !== undefined) ? options.hasQuizzes : true
  const masteryScore = options.masteryScore || 80

  const masteryScoreXml = hasQuizzes
    ? `\n        <adlcp:masteryscore>${masteryScore}</adlcp:masteryscore>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${courseIdentifier}" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG_DEFAULT">
    <organization identifier="ORG_DEFAULT">
      <title>${safeTitle}</title>
      <item identifier="${itemIdentifier}" identifierref="${resourceIdentifier}" isvisible="true">
        <title>${safeTitle}</title>${masteryScoreXml}
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="${resourceIdentifier}" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="SCORM_API_wrapper.js"/>
      <file href="course-data.js"/>
    </resource>
  </resources>
</manifest>`
}

function escapeXml(unsafe) {
  return String(unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}

