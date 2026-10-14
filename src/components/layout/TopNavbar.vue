<script setup>
import { ref } from 'vue'
import { useCourseStore } from '../../stores/courseStore'
import {
  Type, Square, Image, Play, Download, GraduationCap, HelpCircle,
  MousePointerClick, FilePlus, FolderOpen, Save
} from 'lucide-vue-next'
import {
  saveProjectToFile, loadProjectFromFile, serializeProject, saveProjectToIndexedDB
} from '../../services/projectStorage'

const props = defineProps({
  isExporting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['preview', 'export-scorm', 'toast'])

const store = useCourseStore()
const fileInputRef = ref(null)

const handleNewProject = async () => {
  const confirmed = window.confirm('Yeni bir proje başlatmak istediğinize emin misiniz? Kaydedilmemiş değişiklikler kaybolabilir.')
  if (!confirmed) return

  store.resetProject()
  try {
    const serialized = serializeProject(store)
    await saveProjectToIndexedDB(serialized)
  } catch (err) {
    console.warn('[NewProject] IndexedDB kayıt hatası:', err)
  }
  emit('toast', '✓ Yeni proje başarıyla başlatıldı.')
}

const handleSaveProject = () => {
  try {
    saveProjectToFile(store, 'project.json')
    emit('toast', '✓ Proje başarıyla indirildi (project.json).')
  } catch (err) {
    console.error('Proje indirme hatası:', err)
    emit('toast', '✕ Proje indirilirken hata oluştu.')
  }
}

const triggerOpenProject = () => {
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

const handleFileSelected = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const projectData = await loadProjectFromFile(file)
    store.loadProject(projectData)
    const serialized = serializeProject(store)
    await saveProjectToIndexedDB(serialized)
    emit('toast', `✓ "${projectData.courseTitle}" projesi başarıyla açıldı.`)
  } catch (err) {
    console.error('Proje açma hatası:', err)
    const errorMsg = err.message || 'Proje yüklenirken bir hata meydana geldi.'
    emit('toast', `✕ ${errorMsg}`)
    alert(`Proje Açılamadı:\n\n${errorMsg}`)
  } finally {
    if (event.target) {
      event.target.value = ''
    }
  }
}
</script>

<template>
  <header class="top-navbar">
    <div class="brand-section">
      <div class="logo-box">
        <GraduationCap :size="22" class="brand-icon" />
        <span class="brand-text">EdTech Studio</span>
      </div>
      <input
        v-model="store.courseTitle"
        class="course-title-input"
        placeholder="Ders Başlığı Girin..."
        title="Ders Başlığını Değiştir"
      />
    </div>

    <!-- Proje Dosya Araçları -->
    <div class="project-section">
      <button class="btn-tool" @click="handleNewProject" title="Yeni Boş Proje Başlat">
        <FilePlus :size="16" />
        <span>Yeni Proje</span>
      </button>
      <button class="btn-tool" @click="triggerOpenProject" title="Kayıtlı Projeyi Aç (.json)">
        <FolderOpen :size="16" />
        <span>Proje Aç</span>
      </button>
      <button class="btn-tool" @click="handleSaveProject" title="Projeyi project.json Olarak Kaydet">
        <Save :size="16" />
        <span>Proje Kaydet</span>
      </button>
      <input
        ref="fileInputRef"
        type="file"
        accept=".json,application/json"
        style="display: none;"
        @change="handleFileSelected"
      />
    </div>

    <!-- Insert Tools Toolbar -->
    <div class="tools-section">
      <span class="tool-label">Ekle:</span>
      <button class="btn-tool" @click="store.addElement('text')" title="Metin Kutusu Ekle">
        <Type :size="16" />
        <span>Metin</span>
      </button>
      <button class="btn-tool" @click="store.addElement('button')" title="Etkileşimli Buton Ekle">
        <MousePointerClick :size="16" />
        <span>Buton</span>
      </button>
      <button class="btn-tool" @click="store.addElement('shape')" title="Geometrik Şekil Ekle">
        <Square :size="16" />
        <span>Şekil</span>
      </button>
      <button class="btn-tool" @click="store.addElement('image')" title="Görsel Ekle">
        <Image :size="16" />
        <span>Görsel</span>
      </button>
      <div class="tool-divider"></div>
      <button class="btn-tool btn-quiz-tool" @click="store.addSlide('quiz')" title="Çoktan Seçmeli Soru Slaytı Ekle">
        <HelpCircle :size="16" />
        <span>Soru Slaytı</span>
      </button>
    </div>

    <!-- Right Actions -->
    <div class="actions-section">
      <button class="btn-secondary" @click="emit('preview')">
        <Play :size="16" />
        <span>Önizle</span>
      </button>

      <button
        class="btn-primary"
        :disabled="isExporting"
        @click="emit('export-scorm')"
      >
        <Download :size="16" />
        <span>{{ isExporting ? 'Paketleniyor...' : 'SCORM 1.2 Dışa Aktar' }}</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.top-navbar {
  height: 56px;
  background-color: var(--bg-panel);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  gap: 16px;
  flex-shrink: 0;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-box {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent);
}

.brand-icon {
  color: var(--accent);
}

.brand-text {
  font-weight: 700;
  font-size: 15px;
  color: var(--text-main);
  letter-spacing: -0.3px;
}

.course-title-input {
  background: var(--bg-app);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 4px;
  min-width: 220px;
  outline: none;
}

.course-title-input:focus {
  border-color: var(--accent);
}

.project-section {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-app);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.tools-section {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-app);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.tool-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-right: 4px;
}

.btn-tool {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: var(--text-main);
  border: none;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-tool:hover {
  background: var(--bg-panel-hover);
  color: var(--accent);
}

.tool-divider {
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 2px;
}

.btn-quiz-tool {
  color: #c084fc;
}

.btn-quiz-tool:hover {
  color: #a855f7;
  background: rgba(168, 85, 247, 0.15);
}

.actions-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-app);
  color: var(--text-main);
  border: 1px solid var(--border-color);
  padding: 8px 14px;
  border-radius: 5px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-panel-hover);
  border-color: var(--text-muted);
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--accent);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
