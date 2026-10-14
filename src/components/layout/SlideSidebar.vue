<script setup>
import { ref } from 'vue'
import { useCourseStore } from '../../stores/courseStore'
import { Plus, Trash2, Copy, Layers, HelpCircle, FileText, ChevronDown } from 'lucide-vue-next'

const store = useCourseStore()
const isMenuOpen = ref(false)

const handleAdd = (type) => {
  store.addSlide(type)
  isMenuOpen.value = false
}
</script>

<template>
  <aside class="slide-sidebar">
    <div class="sidebar-header">
      <div class="header-title">
        <Layers :size="18" />
        <span>Slaytlar ({{ store.slideCount }})</span>
      </div>

      <!-- Yeni Slayt Dropdown -->
      <div class="add-slide-dropdown">
        <button class="btn-icon-primary" @click="isMenuOpen = !isMenuOpen" title="Yeni Slayt Ekle">
          <Plus :size="16" />
          <span>Ekle</span>
          <ChevronDown :size="14" />
        </button>

        <div v-if="isMenuOpen" class="dropdown-menu">
          <button class="dropdown-item" @click="handleAdd('content')">
            <FileText :size="15" />
            <span>İçerik Slaytı</span>
          </button>
          <button class="dropdown-item" @click="handleAdd('quiz')">
            <HelpCircle :size="15" />
            <span>Soru Slaytı (Test)</span>
          </button>
        </div>
      </div>
    </div>

    <div class="slide-list">
      <div
        v-for="(slide, index) in store.slides"
        :key="slide.id"
        class="slide-item"
        :class="{ active: store.activeSlideId === slide.id, 'is-quiz': slide.type === 'quiz' }"
        @click="store.setActiveSlide(slide.id)"
      >
        <div class="slide-index">{{ index + 1 }}</div>
        
        <div v-if="slide.type === 'quiz'" class="quiz-badge" title="Çoktan Seçmeli Soru Slaytı">
          <HelpCircle :size="12" /> Soru
        </div>

        <div class="slide-preview-card" :style="{ backgroundColor: slide.background }">
          <!-- Quiz Preview Layout -->
          <div v-if="slide.type === 'quiz'" class="mini-quiz-layout">
            <div class="mini-quiz-q"></div>
            <div class="mini-quiz-opt"></div>
            <div class="mini-quiz-opt"></div>
            <div class="mini-quiz-opt"></div>
          </div>
          <!-- Standard Content Preview Layout -->
          <div v-else class="slide-mini-elements">
            <div
              v-for="elem in slide.elements"
              :key="elem.id"
              class="mini-element"
              :class="elem.type"
              :style="{
                left: (elem.x / 960 * 100) + '%',
                top: (elem.y / 540 * 100) + '%',
                width: (elem.width / 960 * 100) + '%',
                height: (elem.height / 540 * 100) + '%'
              }"
            ></div>
          </div>
        </div>

        <div class="slide-info">
          <input
            v-model="slide.title"
            class="slide-title-input"
            @click.stop
            title="Slayt Başlığını Değiştir"
          />
          <div class="slide-actions">
            <button
              class="btn-action"
              @click.stop="store.duplicateSlide(slide.id)"
              title="Slaytı Çoğalt"
            >
              <Copy :size="14" />
            </button>
            <button
              class="btn-action text-danger"
              @click.stop="store.deleteSlide(slide.id)"
              title="Slaytı Sil"
              :disabled="store.slideCount <= 1"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.slide-sidebar {
  width: 260px;
  background-color: var(--bg-panel);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100%;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
}

.btn-icon-primary {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: var(--accent);
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-icon-primary:hover {
  background-color: var(--accent-hover);
}

.slide-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slide-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 6px;
  background-color: var(--bg-app);
  border: 1px solid transparent;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.slide-item:hover {
  border-color: var(--border-color);
  background-color: var(--bg-panel-hover);
}

.slide-item.active {
  border-color: var(--accent);
  background-color: var(--bg-panel-hover);
}

.slide-index {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  z-index: 10;
}

.slide-preview-card {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slide-mini-elements {
  position: relative;
  width: 100%;
  height: 100%;
}

.mini-element {
  position: absolute;
  background: rgba(100, 116, 139, 0.6);
  border-radius: 2px;
}
.mini-element.shape {
  background: rgba(59, 130, 246, 0.7);
}
.mini-element.image {
  background: rgba(16, 185, 129, 0.7);
}

.slide-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.slide-title-input {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-main);
  font-size: 13px;
  padding: 2px 4px;
  border-radius: 4px;
  width: 140px;
}

.slide-title-input:focus {
  background: var(--bg-app);
  border-color: var(--accent);
  outline: none;
}

.slide-actions {
  display: flex;
  gap: 4px;
}

.btn-action {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-action:hover {
  color: var(--text-main);
  background: var(--bg-app);
}

.btn-action.text-danger:hover {
  color: #ef4444;
}

.btn-action:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Dropdown & Quiz Styles */
.add-slide-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  background-color: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 100;
  min-width: 160px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: var(--text-main);
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: var(--accent);
  color: white;
}

.quiz-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(139, 92, 246, 0.9);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 10;
}

.mini-quiz-layout {
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
  justify-content: center;
}

.mini-quiz-q {
  height: 8px;
  background: #cbd5e1;
  border-radius: 2px;
  width: 80%;
}

.mini-quiz-opt {
  height: 6px;
  background: #475569;
  border-radius: 2px;
  width: 90%;
}
</style>
