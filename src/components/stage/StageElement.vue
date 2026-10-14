<script setup>
import { ref } from 'vue'
import { useCourseStore } from '../../stores/courseStore'

const props = defineProps({
  element: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  }
})

const store = useCourseStore()

let isDragging = false
let isResizing = false
let startX = 0
let startY = 0
let initialX = 0
let initialY = 0
let initialW = 0
let initialH = 0

const onMouseDown = (e) => {
  e.stopPropagation()
  store.selectElement(props.element.id)
  
  isDragging = true
  startX = e.clientX
  startY = e.clientY
  initialX = props.element.x
  initialY = props.element.y

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (e) => {
  if (isDragging) {
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    store.updateElement(props.element.id, {
      x: Math.max(0, Math.round(initialX + dx)),
      y: Math.max(0, Math.round(initialY + dy))
    })
  } else if (isResizing) {
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    store.updateElement(props.element.id, {
      width: Math.max(30, Math.round(initialW + dx)),
      height: Math.max(20, Math.round(initialH + dy))
    })
  }
}

const onMouseUp = () => {
  isDragging = false
  isResizing = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

const startResize = (e) => {
  e.stopPropagation()
  isResizing = true
  startX = e.clientX
  startY = e.clientY
  initialW = props.element.width
  initialH = props.element.height

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}
</script>

<template>
  <div
    class="stage-element"
    :class="{ selected: isSelected }"
    :style="{
      left: element.x + 'px',
      top: element.y + 'px',
      width: element.width + 'px',
      height: element.height + 'px',
      zIndex: element.zIndex || 1
    }"
    @mousedown="onMouseDown"
  >
    <!-- Text Type -->
    <div
      v-if="element.type === 'text'"
      class="element-content text-element"
      :style="{
        fontSize: element.fontSize + 'px',
        color: element.fontColor,
        fontWeight: element.fontBold ? 'bold' : 'normal',
        fontStyle: element.fontItalic ? 'italic' : 'normal',
        textAlign: element.textAlign
      }"
    >
      {{ element.text }}
    </div>

    <!-- Shape Type -->
    <div
      v-else-if="element.type === 'shape'"
      class="element-content shape-element"
      :style="{
        backgroundColor: element.fillColor,
        borderColor: element.borderColor,
        borderWidth: element.borderWidth + 'px',
        borderStyle: 'solid',
        borderRadius: element.shapeType === 'circle' ? '50%' : (element.borderRadius + 'px')
      }"
    ></div>

    <!-- Image Type -->
    <div
      v-else-if="element.type === 'image'"
      class="element-content image-element"
    >
      <img
        :src="element.src"
        alt="Ders Görseli"
        :style="{
          objectFit: element.objectFit || 'cover',
          borderRadius: (element.borderRadius || 0) + 'px'
        }"
      />
    </div>

    <!-- Button Type -->
    <div
      v-else-if="element.type === 'button'"
      class="element-content button-element"
      :style="{
        fontSize: (element.fontSize || 15) + 'px',
        color: element.fontColor || '#ffffff',
        backgroundColor: element.bgColor || '#3b82f6',
        borderRadius: (element.borderRadius || 6) + 'px',
        fontWeight: '600',
        justifyContent: 'center'
      }"
    >
      {{ element.text }}
    </div>

    <!-- Trigger Indicator Badge -->
    <div
      v-if="element.action && element.action.type && element.action.type !== 'none'"
      class="trigger-badge"
      :title="'Tetikleyici: ' + (element.action.type === 'jumpToSlide' ? 'Slayta Git' : 'URL Aç')"
    >
      ⚡
    </div>

    <!-- Resize Handle for Selected Elements -->
    <div
      v-if="isSelected"
      class="resize-handle"
      @mousedown="startResize"
      title="Boyutlandır"
    ></div>
  </div>
</template>

<style scoped>
.stage-element {
  position: absolute;
  cursor: move;
  user-select: none;
  box-sizing: border-box;
}

.stage-element.selected {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
}

.element-content {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.text-element {
  word-break: break-word;
  white-space: pre-wrap;
  line-height: 1.3;
  display: block;
}

.image-element img {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  right: -5px;
  bottom: -5px;
  width: 10px;
  height: 10px;
  background-color: #3b82f6;
  border: 1px solid #ffffff;
  border-radius: 2px;
  cursor: se-resize;
  z-index: 100;
}

.button-element {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: transform 0.1s;
}

.trigger-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #f59e0b;
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 99;
}
</style>
