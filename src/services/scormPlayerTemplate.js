import playerTemplateHtml from '../runtime/playerTemplate.html?raw'
import playerJsCode from '../runtime/player.js?raw'

/**
 * Bağımsız (Standalone) HTML5 SCORM 1.2 Oynatıcı Şablonu
 * Geriye dönük uyumluluk için HTML iskeleti ile runtime/player.js kodunu birleştirerek sunar.
 */
export const scormPlayerHtml = playerTemplateHtml.replace('/* INJECT_PLAYER_JS */', () => playerJsCode)
