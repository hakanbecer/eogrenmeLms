<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useCourseStore } from './stores/courseStore'
import TopNavbar from './components/layout/TopNavbar.vue'
import SlideSidebar from './components/layout/SlideSidebar.vue'
import StageCanvas from './components/layout/StageCanvas.vue'
import PropertyPanel from './components/layout/PropertyPanel.vue'
import PreviewModal from './components/layout/PreviewModal.vue'
import { exportToScormPackage } from './services/scormExporter'
import { loadProjectFromIndexedDB, setupAutoSave, validateProjectData } from './services/projectStorage'

const store = useCourseStore()
const isPreviewOpen = ref(false)
const isExporting = ref(false)
const toastMessage = ref('')
let stopAutoSave = null

const showToast = (msg) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

onMounted(async () => {
  // 1. Açılışta IndexedDB'de kayıtlı son proje varsa geri yükle
  try {
    const savedProject = await loadProjectFromIndexedDB()
    if (savedProject) {
      const validation = validateProjectData(savedProject)
      if (validation.isValid) {
        store.loadProject(savedProject)
        showToast('✓ Önceki çalışma tarayıcı hafızasından geri yüklendi.')
      } else {
        console.warn('[Startup] IndexedDB verisi doğrulanamadı:', validation.error)
      }
    }
  } catch (err) {
    console.warn('[Startup] IndexedDB yükleme uyarısı:', err)
  }

  // 2. 3 saniye debounce ile otomatik kayıt dinleyicisini başlat
  stopAutoSave = setupAutoSave(store, 3000)
})

onUnmounted(() => {
  if (typeof stopAutoSave === 'function') {
    stopAutoSave()
  }
})

const handleExportScorm = async () => {
  try {
    isExporting.value = true
    await exportToScormPackage(store)
    showToast('✓ SCORM 1.2 paketi başarıyla oluşturuldu ve indirildi!')
  } catch (err) {
    console.error('SCORM Dışa aktarma hatası:', err)
    showToast('✕ Paket oluşturulurken bir hata meydana geldi.')
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="app-root">
    <!-- Üst Menü / Araç Çubuğu -->
    <TopNavbar
      :is-exporting="isExporting"
      @preview="isPreviewOpen = true"
      @export-scorm="handleExportScorm"
      @toast="showToast"
    />

    <!-- Ana Çalışma Alanı -->
    <main class="workspace-layout">
      <!-- Sol Panel: Slayt Yönetimi -->
      <SlideSidebar />

      <!-- Orta Panel: Sahne & Kanvas -->
      <StageCanvas />

      <!-- Sağ Panel: Seçili Öğe / Slayt Özellikleri -->
      <PropertyPanel />
    </main>

    <!-- Önizleme Modalı -->
    <PreviewModal
      :is-open="isPreviewOpen"
      @close="isPreviewOpen = false"
    />

    <!-- Bildirim Bildirisi (Toast) -->
    <div v-if="toastMessage" class="toast-notification">
      {{ toastMessage }}
    </div>
  </div>
</template>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: var(--bg-app);
}

.workspace-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.toast-notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background-color: #10b981;
  color: white;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  z-index: 2000;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
