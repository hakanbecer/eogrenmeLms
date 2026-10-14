<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useCourseStore } from '../../stores/courseStore'
import { buildPlayerHtml } from '../../services/scormExporter'
import { X, Activity, ChevronDown, ChevronUp, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const store = useCourseStore()
const playerSrcDoc = ref('')
const isLogPanelOpen = ref(true)

// SCORM Durum Verileri
const scormState = ref({
  status: 'not attempted',
  score: '-',
  location: '0'
})

// SCORM API Çağrı Günlüğü (Log)
const scormLogs = ref([])

function addLog(method, param, val, res) {
  const time = new Date().toLocaleTimeString()
  scormLogs.value.unshift({
    id: Date.now() + Math.random(),
    time,
    method,
    param: param || '',
    val: val !== undefined ? String(val) : '',
    res: res !== undefined ? String(res) : 'true'
  })
}

/**
 * Üst pencerede (window) sahte SCORM 1.2 API'sini kurar.
 * Iframe içindeki pipwerks SCORM wrapper window.parent.API üzerinden buraya bağlanır.
 */
function setupMockScormApi() {
  const cmi = {
    'cmi.core.lesson_status': 'not attempted',
    'cmi.core.lesson_location': '0',
    'cmi.core.score.raw': '',
    'cmi.core.score.min': '0',
    'cmi.core.score.max': '100'
  }

  scormState.value = {
    status: 'not attempted',
    score: '-',
    location: '0'
  }
  scormLogs.value = []

  window.API = {
    LMSInitialize: (param) => {
      addLog('LMSInitialize', param, undefined, 'true')
      return 'true'
    },
    LMSGetValue: (param) => {
      const val = cmi[param] !== undefined ? String(cmi[param]) : ''
      addLog('LMSGetValue', param, val, val)
      return val
    },
    LMSSetValue: (param, val) => {
      cmi[param] = String(val)
      if (param === 'cmi.core.lesson_status') {
        scormState.value.status = String(val)
      } else if (param === 'cmi.core.score.raw') {
        scormState.value.score = String(val)
      } else if (param === 'cmi.core.lesson_location') {
        scormState.value.location = String(val)
      }
      addLog('LMSSetValue', param, val, 'true')
      return 'true'
    },
    LMSCommit: (param) => {
      addLog('LMSCommit', param, undefined, 'true')
      return 'true'
    },
    LMSFinish: (param) => {
      addLog('LMSFinish', param, undefined, 'true')
      return 'true'
    },
    LMSGetLastError: () => '0',
    LMSGetErrorString: () => 'No error',
    LMSGetDiagnostic: () => ''
  }
}

/**
 * Sahte SCORM API'sini temizler.
 */
function teardownMockScormApi() {
  if (typeof window !== 'undefined' && window.API) {
    try {
      delete window.API
    } catch (e) {
      window.API = null
    }
  }
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    setupMockScormApi()
    // Exporter ile aynı fonksiyon üzerinden tam bağımsız HTML oynatıcı çıktısı üretilir
    playerSrcDoc.value = buildPlayerHtml(store)
  } else {
    playerSrcDoc.value = ''
    teardownMockScormApi()
  }
}, { immediate: true })

const closeModal = () => {
  playerSrcDoc.value = ''
  teardownMockScormApi()
  emit('close')
}

const clearLogs = () => {
  scormLogs.value = []
}

onUnmounted(() => {
  teardownMockScormApi()
})
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click="closeModal">
    <div class="modal-container" @click.stop>
      <!-- Modal Üst Çubuğu -->
      <div class="modal-header">
        <div class="header-left">
          <span class="preview-badge">CANLI SCORM ÖNİZLEME</span>
          <h3 class="course-name">{{ store.courseTitle }}</h3>
        </div>

        <!-- Hızlı Durum Göstergeleri & Araçlar -->
        <div class="header-right">
          <div class="status-chips">
            <span class="chip-status" :class="scormState.status">
              Durum: {{ scormState.status }}
            </span>
            <span v-if="scormState.score !== '-'" class="chip-score">
              Puan: {{ scormState.score }} / 100
            </span>
          </div>

          <button
            class="btn-toggle-log"
            :class="{ 'active': isLogPanelOpen }"
            @click="isLogPanelOpen = !isLogPanelOpen"
            title="SCORM 1.2 API Günlüğünü Göster/Gizle"
          >
            <Activity :size="15" />
            <span>SCORM Log ({{ scormLogs.length }})</span>
          </button>

          <button class="btn-close" @click="closeModal" title="Önizlemeyi Kapat">
            <X :size="20" />
          </button>
        </div>
      </div>

      <!-- Modal Gövdesi (Iframe & SCORM Log Paneli) -->
      <div class="modal-body">
        <!-- Standalone SCORM Oynatıcı Iframe -->
        <iframe
          v-if="playerSrcDoc"
          class="preview-iframe"
          :srcdoc="playerSrcDoc"
          allow="autoplay"
          title="SCORM 1.2 Önizleme Oynatıcısı"
        ></iframe>

        <!-- Küçük, Kapatılabilir SCORM 1.2 Log Paneli -->
        <aside v-if="isLogPanelOpen" class="scorm-log-panel">
          <div class="log-panel-header">
            <div class="log-panel-title">
              <Activity :size="14" class="icon-pulse" />
              <span>SCORM 1.2 LMS İletişim Monitörü</span>
            </div>
            <div class="log-panel-actions">
              <button class="btn-icon" @click="clearLogs" title="Logları Temizle">
                <Trash2 :size="13" />
              </button>
              <button class="btn-icon" @click="isLogPanelOpen = false" title="Paneli Gizle">
                <ChevronDown :size="15" />
              </button>
            </div>
          </div>

          <!-- Log Özeti -->
          <div class="log-summary-bar">
            <div class="summary-item">
              <span class="summary-label">lesson_status:</span>
              <span class="summary-badge" :class="scormState.status">{{ scormState.status }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">score.raw:</span>
              <span class="summary-badge score">{{ scormState.score }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">location:</span>
              <span class="summary-val">Slayt {{ parseInt(scormState.location || 0) + 1 }}</span>
            </div>
          </div>

          <!-- Log Akışı Listesi -->
          <div class="log-stream">
            <div v-if="scormLogs.length === 0" class="log-empty">
              Henüz bir SCORM LMS çağrısı gerçekleşmedi.
            </div>
            <div
              v-for="log in scormLogs"
              :key="log.id"
              class="log-entry"
              :class="log.method.toLowerCase()"
            >
              <span class="log-time">{{ log.time }}</span>
              <span class="log-method">{{ log.method }}</span>
              <span v-if="log.param" class="log-param">({{ log.param }}<template v-if="log.val">, "{{ log.val }}"</template>)</span>
              <span class="log-result">➔ {{ log.res }}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  backdrop-filter: blur(4px);
}

.modal-container {
  width: 1200px;
  max-width: 96vw;
  height: 780px;
  max-height: 94vh;
  background: #0f172a;
  border-radius: 10px;
  border: 1px solid #334155;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
}

.modal-header {
  height: 52px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-badge {
  background: #3b82f6;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 4px;
  letter-spacing: 0.4px;
}

.course-name {
  font-size: 15px;
  color: #f8fafc;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 380px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-chips {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chip-status {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 9999px;
  background: #334155;
  color: #94a3b8;
}

.chip-status.passed, .chip-status.completed {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid #10b981;
}

.chip-status.failed {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid #ef4444;
}

.chip-status.incomplete {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid #f59e0b;
}

.chip-score {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 9999px;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid #0284c7;
}

.btn-toggle-log {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #334155;
  color: #cbd5e1;
  border: 1px solid #475569;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-toggle-log:hover {
  background: #475569;
  color: white;
}

.btn-toggle-log.active {
  background: #1e3a5f;
  color: #38bdf8;
  border-color: #0284c7;
}

.btn-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

.btn-close:hover {
  color: white;
  background: #334155;
}

.modal-body {
  flex: 1;
  background: #0b1120;
  position: relative;
  overflow: hidden;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  display: block;
}

/* Kapatılabilir SCORM 1.2 Log Paneli */
.scorm-log-panel {
  position: absolute;
  bottom: 14px;
  right: 14px;
  width: 480px;
  max-width: calc(100% - 28px);
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid #334155;
  border-radius: 8px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  z-index: 50;
  backdrop-filter: blur(10px);
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.log-panel-header {
  height: 36px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 7px 7px 0 0;
}

.log-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #f1f5f9;
}

.icon-pulse {
  color: #38bdf8;
}

.log-panel-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-icon {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: all 0.15s;
}

.btn-icon:hover {
  color: white;
  background: #334155;
}

.log-summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: rgba(30, 41, 59, 0.5);
  border-bottom: 1px solid #334155;
  font-size: 11px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.summary-label {
  color: #64748b;
  font-family: monospace;
}

.summary-badge {
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  background: #334155;
  color: #cbd5e1;
}

.summary-badge.passed, .summary-badge.completed {
  background: rgba(16, 185, 129, 0.25);
  color: #34d399;
}

.summary-badge.failed {
  background: rgba(239, 68, 68, 0.25);
  color: #f87171;
}

.summary-badge.incomplete {
  background: rgba(245, 158, 11, 0.25);
  color: #fbbf24;
}

.summary-badge.score {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}

.summary-val {
  color: #cbd5e1;
  font-weight: 500;
}

.log-stream {
  max-height: 180px;
  overflow-y: auto;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}

.log-empty {
  color: #64748b;
  text-align: center;
  padding: 18px 0;
  font-style: italic;
}

.log-entry {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  border-radius: 4px;
  background: rgba(30, 41, 59, 0.4);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-time {
  color: #64748b;
  font-size: 10px;
}

.log-method {
  color: #38bdf8;
  font-weight: 700;
}

.log-entry.lmssetvalue .log-method {
  color: #a78bfa;
}

.log-entry.lmscommit .log-method {
  color: #34d399;
}

.log-entry.lmsfinish .log-method {
  color: #fb7185;
}

.log-param {
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-result {
  color: #94a3b8;
  margin-left: auto;
  font-size: 10px;
}
</style>
