<script setup>
import { computed } from 'vue'
import { useCourseStore } from '../../stores/courseStore'
import StageElement from '../stage/StageElement.vue'

const store = useCourseStore()

const currentSlide = computed(() => store.activeSlide)

const handleCanvasClick = (e) => {
  if (e.target.classList.contains('canvas-wrapper') || e.target.classList.contains('slide-stage')) {
    store.selectElement(null)
  }
}
</script>

<template>
  <div class="canvas-wrapper" @click="handleCanvasClick">
    <div
      v-if="currentSlide"
      class="slide-stage"
      :style="{ backgroundColor: currentSlide.background }"
      @click.stop="handleCanvasClick"
    >
      <!-- Quiz Slide Layout on Stage -->
      <div v-if="currentSlide.type === 'quiz' && currentSlide.quiz" class="stage-quiz-view">
        <div class="stage-quiz-badge">ÇOKTAN SEÇMELİ TEST SLAYTI</div>
        <div class="stage-quiz-card">
          <div class="stage-quiz-question">
            {{ currentSlide.quiz.question }}
          </div>

          <div class="stage-quiz-options">
            <div
              v-for="opt in currentSlide.quiz.options"
              :key="opt.id"
              class="stage-quiz-opt-item"
              :class="{ 'is-correct': currentSlide.quiz.correctAnswer === opt.id }"
            >
              <div class="opt-prefix">{{ opt.id }}</div>
              <div class="opt-text">{{ opt.text }}</div>
              <div v-if="currentSlide.quiz.correctAnswer === opt.id" class="correct-tag">
                Doğru Cevap ✓
              </div>
            </div>
          </div>

          <div class="stage-quiz-footer">
            <span class="score-indicator">Değer: {{ currentSlide.quiz.points || 100 }} Puan</span>
            <button class="stage-quiz-btn" disabled>Cevapla</button>
          </div>
        </div>
      </div>

      <!-- Standard Content Slide Layout on Stage -->
      <template v-else>
        <StageElement
          v-for="element in currentSlide.elements"
          :key="element.id"
          :element="element"
          :is-selected="store.selectedElementId === element.id"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.canvas-wrapper {
  flex: 1;
  background-color: var(--canvas-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 40px;
  position: relative;
}

.slide-stage {
  width: var(--slide-width);
  height: var(--slide-height);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
  border-radius: 4px;
  flex-shrink: 0;
}

/* Stage Quiz View */
.stage-quiz-view {
  width: 100%;
  height: 100%;
  padding: 32px 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
}

.stage-quiz-badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.4);
  padding: 4px 12px;
  border-radius: 9999px;
  margin-bottom: 16px;
}

.stage-quiz-card {
  width: 100%;
  max-width: 820px;
  background: rgba(30, 41, 59, 0.75);
  border: 1px solid rgba(71, 85, 105, 0.4);
  border-radius: 12px;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.stage-quiz-question {
  font-size: 20px;
  font-weight: 600;
  color: #f8fafc;
  line-height: 1.4;
}

.stage-quiz-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stage-quiz-opt-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 10px 14px;
  color: #e2e8f0;
  font-size: 14px;
  transition: all 0.2s;
}

.stage-quiz-opt-item.is-correct {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.opt-prefix {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  color: #f1f5f9;
}

.stage-quiz-opt-item.is-correct .opt-prefix {
  background: #10b981;
  color: #ffffff;
}

.opt-text {
  flex: 1;
}

.correct-tag {
  font-size: 11px;
  font-weight: 600;
  color: #34d399;
  background: rgba(16, 185, 129, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
}

.stage-quiz-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #334155;
  padding-top: 12px;
  margin-top: 4px;
}

.score-indicator {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.stage-quiz-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  opacity: 0.6;
  cursor: default;
}
</style>
