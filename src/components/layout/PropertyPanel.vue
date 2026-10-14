<script setup>
import { computed } from 'vue'
import { useCourseStore } from '../../stores/courseStore'
import { Sliders, Trash2, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Upload, Zap } from 'lucide-vue-next'

const store = useCourseStore()

const selectedElement = computed(() => store.selectedElement)
const activeSlide = computed(() => store.activeSlide)

const updateProp = (key, value) => {
  if (selectedElement.value) {
    store.updateElement(selectedElement.value.id, { [key]: value })
  }
}

const updateActionProp = (key, value) => {
  if (selectedElement.value) {
    if (!selectedElement.value.action) {
      selectedElement.value.action = { type: 'none', targetSlideId: '', url: '' }
    }
    selectedElement.value.action[key] = value
  }
}

const handleFileUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    updateProp('src', event.target.result)
  }
  reader.readAsDataURL(file)
}
</script>

<template>
  <aside class="property-panel">
    <div class="panel-header">
      <Sliders :size="18" />
      <span>Özellikler</span>
    </div>

    <!-- Element Properties -->
    <div v-if="selectedElement" class="panel-body">
      <div class="section-title">
        <span>{{ selectedElement.type.toUpperCase() }} ÖZELLİKLERİ</span>
        <button
          class="btn-delete"
          @click="store.deleteElement(selectedElement.id)"
          title="Elemanı Sil"
        >
          <Trash2 :size="15" />
        </button>
      </div>

      <!-- Geometry -->
      <div class="prop-group">
        <label class="group-label">Konum ve Boyut</label>
        <div class="grid-2">
          <div class="input-item">
            <span>X</span>
            <input
              type="number"
              :value="selectedElement.x"
              @input="updateProp('x', parseInt($event.target.value) || 0)"
            />
          </div>
          <div class="input-item">
            <span>Y</span>
            <input
              type="number"
              :value="selectedElement.y"
              @input="updateProp('y', parseInt($event.target.value) || 0)"
            />
          </div>
          <div class="input-item">
            <span>W</span>
            <input
              type="number"
              :value="selectedElement.width"
              @input="updateProp('width', parseInt($event.target.value) || 10)"
            />
          </div>
          <div class="input-item">
            <span>H</span>
            <input
              type="number"
              :value="selectedElement.height"
              @input="updateProp('height', parseInt($event.target.value) || 10)"
            />
          </div>
        </div>
      </div>

      <!-- Text Specific Properties -->
      <div v-if="selectedElement.type === 'text'" class="prop-group">
        <label class="group-label">Metin İçeriği</label>
        <textarea
          class="text-area-input"
          :value="selectedElement.text"
          @input="updateProp('text', $event.target.value)"
          rows="3"
        ></textarea>

        <div class="style-row">
          <div class="input-item flex-1">
            <span>Punto</span>
            <input
              type="number"
              :value="selectedElement.fontSize"
              @input="updateProp('fontSize', parseInt($event.target.value) || 12)"
            />
          </div>
          <div class="color-picker-item">
            <span>Renk</span>
            <input
              type="color"
              :value="selectedElement.fontColor"
              @input="updateProp('fontColor', $event.target.value)"
            />
          </div>
        </div>

        <div class="formatting-toolbar">
          <button
            class="fmt-btn"
            :class="{ active: selectedElement.fontBold }"
            @click="updateProp('fontBold', !selectedElement.fontBold)"
            title="Kalın"
          >
            <Bold :size="16" />
          </button>
          <button
            class="fmt-btn"
            :class="{ active: selectedElement.fontItalic }"
            @click="updateProp('fontItalic', !selectedElement.fontItalic)"
            title="İtalik"
          >
            <Italic :size="16" />
          </button>
          <div class="divider"></div>
          <button
            class="fmt-btn"
            :class="{ active: selectedElement.textAlign === 'left' }"
            @click="updateProp('textAlign', 'left')"
            title="Sola Hizala"
          >
            <AlignLeft :size="16" />
          </button>
          <button
            class="fmt-btn"
            :class="{ active: selectedElement.textAlign === 'center' }"
            @click="updateProp('textAlign', 'center')"
            title="Ortala"
          >
            <AlignCenter :size="16" />
          </button>
          <button
            class="fmt-btn"
            :class="{ active: selectedElement.textAlign === 'right' }"
            @click="updateProp('textAlign', 'right')"
            title="Sağa Hizala"
          >
            <AlignRight :size="16" />
          </button>
        </div>
      </div>

      <!-- Shape Specific Properties -->
      <div v-if="selectedElement.type === 'shape'" class="prop-group">
        <label class="group-label">Şekil Stili</label>
        
        <div class="select-item mb-2">
          <span>Tip:</span>
          <select
            :value="selectedElement.shapeType"
            @change="updateProp('shapeType', $event.target.value)"
          >
            <option value="rectangle">Dikdörtgen</option>
            <option value="circle">Daire</option>
          </select>
        </div>

        <div class="style-row">
          <div class="color-picker-item">
            <span>Dolgu</span>
            <input
              type="color"
              :value="selectedElement.fillColor"
              @input="updateProp('fillColor', $event.target.value)"
            />
          </div>
          <div class="color-picker-item">
            <span>Kenarlık</span>
            <input
              type="color"
              :value="selectedElement.borderColor"
              @input="updateProp('borderColor', $event.target.value)"
            />
          </div>
        </div>

        <div class="grid-2 mt-2">
          <div class="input-item">
            <span>Çerçeve (px)</span>
            <input
              type="number"
              :value="selectedElement.borderWidth"
              @input="updateProp('borderWidth', parseInt($event.target.value) || 0)"
            />
          </div>
          <div class="input-item" v-if="selectedElement.shapeType !== 'circle'">
            <span>Köşe (px)</span>
            <input
              type="number"
              :value="selectedElement.borderRadius"
              @input="updateProp('borderRadius', parseInt($event.target.value) || 0)"
            />
          </div>
        </div>
      </div>

      <!-- Image Specific Properties -->
      <div v-if="selectedElement.type === 'image'" class="prop-group">
        <label class="group-label">Görsel Seçimi</label>
        
        <label class="file-upload-btn">
          <Upload :size="16" />
          <span>Yerelden Resim Yükle</span>
          <input type="file" accept="image/*" @change="handleFileUpload" hidden />
        </label>

        <div class="input-item mt-2">
          <span>URL</span>
          <input
            type="text"
            :value="selectedElement.src"
            @input="updateProp('src', $event.target.value)"
            placeholder="https://..."
          />
        </div>
      </div>

      <!-- Button Specific Properties -->
      <div v-if="selectedElement.type === 'button'" class="prop-group">
        <label class="group-label">Buton Özellikleri</label>

        <div class="input-item">
          <span>Metin</span>
          <input
            type="text"
            :value="selectedElement.text"
            @input="updateProp('text', $event.target.value)"
            placeholder="Buton metni..."
          />
        </div>

        <div class="grid-2 mt-2">
          <div class="input-item">
            <span>Punto</span>
            <input
              type="number"
              :value="selectedElement.fontSize || 15"
              @input="updateProp('fontSize', parseInt($event.target.value) || 12)"
            />
          </div>
          <div class="input-item">
            <span>Köşe (px)</span>
            <input
              type="number"
              :value="selectedElement.borderRadius || 6"
              @input="updateProp('borderRadius', parseInt($event.target.value) || 0)"
            />
          </div>
        </div>

        <div class="style-row mt-2">
          <div class="color-picker-item">
            <span>Yazı Rengi</span>
            <input
              type="color"
              :value="selectedElement.fontColor || '#ffffff'"
              @input="updateProp('fontColor', $event.target.value)"
            />
          </div>
          <div class="color-picker-item">
            <span>Arka Plan</span>
            <input
              type="color"
              :value="selectedElement.bgColor || '#3b82f6'"
              @input="updateProp('bgColor', $event.target.value)"
            />
          </div>
        </div>
      </div>

      <!-- Universal Trigger (Action) Settings -->
      <div class="prop-group trigger-section mt-3">
        <div class="section-title trigger-title">
          <div class="flex-align-center gap-1">
            <Zap :size="14" class="text-amber" />
            <span>TIKLAMA EYLEMİ (TRIGGER)</span>
          </div>
        </div>

        <div class="select-item mt-2">
          <span>Eylem:</span>
          <select
            :value="selectedElement.action?.type || 'none'"
            @change="updateActionProp('type', $event.target.value)"
          >
            <option value="none">Eylem Yok (Standart)</option>
            <option value="jumpToSlide">Slayta Git (Jump to Slide)</option>
            <option value="openUrl">Dış Bağlantı Aç (Open URL)</option>
          </select>
        </div>

        <!-- Jump to Slide Target Selector -->
        <div v-if="selectedElement.action?.type === 'jumpToSlide'" class="select-item mt-2">
          <span>Hedef:</span>
          <select
            :value="selectedElement.action?.targetSlideId || ''"
            @change="updateActionProp('targetSlideId', $event.target.value)"
          >
            <option value="">-- Slayt Seçin --</option>
            <option
              v-for="(s, idx) in store.slides"
              :key="s.id"
              :value="s.id"
            >
              {{ idx + 1 }}. {{ s.title }} {{ s.type === 'quiz' ? '(Soru)' : '' }}
            </option>
          </select>
        </div>

        <!-- Open URL Target Field -->
        <div v-if="selectedElement.action?.type === 'openUrl'" class="input-item mt-2">
          <span>URL</span>
          <input
            type="text"
            :value="selectedElement.action?.url || ''"
            @input="updateActionProp('url', $event.target.value)"
            placeholder="https://meb.gov.tr"
          />
        </div>
      </div>
    </div>

    <!-- Slide Properties (When no element is selected) -->
    <div v-else class="panel-body">
      <!-- Quiz Slide Settings -->
      <div v-if="activeSlide && activeSlide.type === 'quiz' && activeSlide.quiz">
        <div class="section-title">
          <span>SORU & TEST AYARLARI</span>
        </div>

        <div class="prop-group mt-2">
          <label class="group-label">Soru Metni</label>
          <textarea
            class="text-area-input"
            v-model="activeSlide.quiz.question"
            rows="3"
            placeholder="Soru metnini yazın..."
          ></textarea>
        </div>

        <div class="prop-group mt-3">
          <div class="flex-between">
            <label class="group-label">Seçenekler</label>
            <span class="sub-label">Doğru Şıkkı İşaretleyin</span>
          </div>

          <div
            v-for="opt in activeSlide.quiz.options"
            :key="opt.id"
            class="quiz-option-row"
            :class="{ 'is-selected-answer': activeSlide.quiz.correctAnswer === opt.id }"
          >
            <label class="radio-label" :title="opt.id + ' Doğru Cevap Yap'">
              <input
                type="radio"
                name="correctAnswerGroup"
                :value="opt.id"
                v-model="activeSlide.quiz.correctAnswer"
              />
              <span class="opt-badge">{{ opt.id }}</span>
            </label>
            <input
              type="text"
              class="text-input flex-1"
              v-model="opt.text"
              :placeholder="opt.id + ' seçeneği'"
            />
          </div>
        </div>

        <div class="prop-group mt-3">
          <label class="group-label">Soru Puanı (Ham Puan)</label>
          <input
            type="number"
            class="text-input"
            v-model.number="activeSlide.quiz.points"
            min="1"
            max="100"
          />
        </div>

        <div class="prop-group mt-3">
          <label class="group-label">Doğru Cevap Bildirimi</label>
          <input
            type="text"
            class="text-input"
            v-model="activeSlide.quiz.feedbackCorrect"
          />
        </div>

        <div class="prop-group mt-2">
          <label class="group-label">Yanlış Cevap Bildirimi</label>
          <input
            type="text"
            class="text-input"
            v-model="activeSlide.quiz.feedbackIncorrect"
          />
        </div>

        <div class="prop-group mt-3">
          <label class="group-label">Slayt Başlığı</label>
          <input
            type="text"
            class="text-input"
            v-model="activeSlide.title"
          />

          <div class="color-picker-item mt-2">
            <span>Arka Plan Rengi</span>
            <input
              type="color"
              :value="activeSlide.background"
              @input="store.updateSlideBackground($event.target.value)"
            />
          </div>
        </div>
      </div>

      <!-- Standard Content Slide Settings -->
      <div v-else-if="activeSlide">
        <div class="section-title">
          <span>SLAYT AYARLARI</span>
        </div>

        <div class="prop-group">
          <label class="group-label">Slayt Başlığı</label>
          <input
            type="text"
            class="text-input"
            v-model="activeSlide.title"
          />

          <div class="color-picker-item mt-3">
            <span>Arka Plan Rengi</span>
            <input
              type="color"
              :value="activeSlide.background"
              @input="store.updateSlideBackground($event.target.value)"
            />
          </div>

          <div class="info-box mt-4">
            <p>Sahnedeki herhangi bir nesneye tıklayarak özelliklerini düzenleyebilirsiniz.</p>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.property-panel {
  width: 280px;
  background-color: var(--bg-panel);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100%;
  flex-shrink: 0;
}

.panel-header {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
  font-size: 14px;
}

.panel-body {
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.btn-delete {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.1);
}

.prop-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.input-item {
  display: flex;
  align-items: center;
  background: var(--bg-app);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px 8px;
  gap: 6px;
}

.input-item span {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}

.input-item input {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-main);
  font-size: 13px;
  outline: none;
}

.text-input,
.text-area-input {
  width: 100%;
  background: var(--bg-app);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 8px;
  color: var(--text-main);
  font-size: 13px;
  outline: none;
  font-family: inherit;
  resize: vertical;
}

.text-input:focus,
.text-area-input:focus {
  border-color: var(--accent);
}

.style-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-app);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px 8px;
  flex: 1;
}

.color-picker-item span {
  font-size: 12px;
  color: var(--text-muted);
}

.color-picker-item input[type="color"] {
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
}

.formatting-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-app);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px;
}

.fmt-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fmt-btn:hover {
  background: var(--bg-panel-hover);
  color: var(--text-main);
}

.fmt-btn.active {
  background: var(--accent);
  color: white;
}

.divider {
  width: 1px;
  height: 18px;
  background: var(--border-color);
  margin: 0 4px;
}

.select-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-app);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px 8px;
}

.select-item span {
  font-size: 12px;
  color: var(--text-muted);
}

.select-item select {
  background: transparent;
  border: none;
  color: var(--text-main);
  outline: none;
  font-size: 13px;
  cursor: pointer;
}

.select-item select option {
  background: var(--bg-panel);
}

.file-upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--bg-app);
  border: 1px dashed var(--accent);
  padding: 10px;
  border-radius: 4px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.file-upload-btn:hover {
  background: rgba(59, 130, 246, 0.1);
}

.info-box {
  padding: 12px;
  background: var(--bg-app);
  border-radius: 6px;
  border-left: 3px solid var(--accent);
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
}

.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }
.mb-2 { margin-bottom: 8px; }
.flex-1 { flex: 1; }

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sub-label {
  font-size: 11px;
  color: var(--accent);
  font-weight: 500;
}

.quiz-option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-app);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 6px;
  transition: all 0.2s;
}

.quiz-option-row.is-selected-answer {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.radio-label input[type="radio"] {
  cursor: pointer;
  accent-color: #10b981;
}

.opt-badge {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-main);
  background: var(--bg-panel);
  padding: 2px 6px;
  border-radius: 4px;
}

.quiz-option-row.is-selected-answer .opt-badge {
  background: #10b981;
  color: white;
}

/* Trigger Styles */
.trigger-section {
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
}

.trigger-title {
  color: #f59e0b;
}

.text-amber {
  color: #f59e0b;
}

.flex-align-center {
  display: flex;
  align-items: center;
}

.gap-1 {
  gap: 4px;
}
</style>
