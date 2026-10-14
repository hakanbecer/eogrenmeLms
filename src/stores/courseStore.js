import { defineStore } from 'pinia'

export const useCourseStore = defineStore('course', {
  state: () => ({
    courseTitle: 'Yeni E-Öğrenme Dersi',
    author: 'Eğitmen',
    activeSlideId: 'slide-1',
    selectedElementId: null,
    slides: [
      {
        id: 'slide-1',
        type: 'content',
        title: 'Giriş Slaytı',
        background: '#ffffff',
        elements: [
          {
            id: 'elem-1',
            type: 'text',
            text: 'Ders Başlığına Hoş Geldiniz',
            x: 80,
            y: 80,
            width: 800,
            height: 60,
            fontSize: 32,
            fontColor: '#1e293b',
            fontBold: true,
            fontItalic: false,
            textAlign: 'center',
            zIndex: 1
          },
          {
            id: 'elem-2',
            type: 'text',
            text: 'Bu içerik web tabanlı SCORM içerik geliştirme aracı ile hazırlanmıştır.',
            x: 130,
            y: 180,
            width: 700,
            height: 80,
            fontSize: 20,
            fontColor: '#64748b',
            fontBold: false,
            fontItalic: false,
            textAlign: 'center',
            zIndex: 2
          }
        ]
      }
    ]
  }),

  getters: {
    activeSlide: (state) => {
      return state.slides.find(s => s.id === state.activeSlideId) || state.slides[0]
    },
    selectedElement: (state) => {
      const slide = state.slides.find(s => s.id === state.activeSlideId)
      if (!slide || !slide.elements) return null
      return slide.elements.find(e => e.id === state.selectedElementId) || null
    },
    slideCount: (state) => state.slides.length,
    quizSlideCount: (state) => state.slides.filter(s => s.type === 'quiz').length
  },

  actions: {
    setActiveSlide(id) {
      this.activeSlideId = id
      this.selectedElementId = null
    },

    addSlide(type = 'content') {
      const newId = `slide-${Date.now()}`
      const slideIndex = this.slides.length + 1
      let newSlide

      if (type === 'quiz') {
        const quizIndex = this.slides.filter(s => s.type === 'quiz').length + 1
        newSlide = {
          id: newId,
          type: 'quiz',
          title: `Soru ${quizIndex}`,
          background: '#0f172a',
          elements: [],
          quiz: {
            question: 'Aşağıdakilerden hangisi SCORM standartlarının temel avantajlarından biridir?',
            options: [
              { id: 'A', text: 'Farklı LMS platformlarında yeniden kullanılabilirlik ve taşınabilirlik' },
              { id: 'B', text: 'Sadece tek bir web sunucusunda çalışabilmesi' },
              { id: 'C', text: 'Öğrenci puanlarını ve süresini kaydetmemesi' },
              { id: 'D', text: 'Yalnızca masaüstü cihazlarda açılabilmesi' }
            ],
            correctAnswer: 'A',
            points: 100,
            feedbackCorrect: 'Tebrikler! Doğru cevap.',
            feedbackIncorrect: 'Maalesef yanlış cevap.'
          }
        }
      } else {
        newSlide = {
          id: newId,
          type: 'content',
          title: `Slayt ${slideIndex}`,
          background: '#ffffff',
          elements: [
            {
              id: `elem-${Date.now()}`,
              type: 'text',
              text: `Slayt ${slideIndex} Başlığı`,
              x: 80,
              y: 60,
              width: 800,
              height: 50,
              fontSize: 28,
              fontColor: '#1e293b',
              fontBold: true,
              fontItalic: false,
              textAlign: 'left',
              zIndex: 1
            }
          ]
        }
      }

      this.slides.push(newSlide)
      this.setActiveSlide(newId)
    },

    deleteSlide(id) {
      if (this.slides.length <= 1) {
        alert('En az bir slayt bulunmalıdır.')
        return
      }
      const index = this.slides.findIndex(s => s.id === id)
      if (index !== -1) {
        this.slides.splice(index, 1)
        const nextSlide = this.slides[Math.max(0, index - 1)]
        this.setActiveSlide(nextSlide.id)
      }
    },

    duplicateSlide(id) {
      const slide = this.slides.find(s => s.id === id)
      if (!slide) return
      const newId = `slide-${Date.now()}`
      const clonedSlide = JSON.parse(JSON.stringify(slide))
      clonedSlide.id = newId
      clonedSlide.title = `${slide.title} (Kopya)`
      if (clonedSlide.elements) {
        clonedSlide.elements.forEach((el, idx) => {
          el.id = `elem-${Date.now()}-${idx}`
        })
      }
      const index = this.slides.findIndex(s => s.id === id)
      this.slides.splice(index + 1, 0, clonedSlide)
      this.setActiveSlide(newId)
    },

    updateQuizData(slideId, quizData) {
      const slide = this.slides.find(s => s.id === slideId)
      if (slide && slide.quiz) {
        Object.assign(slide.quiz, quizData)
      }
    },

    selectElement(id) {
      this.selectedElementId = id
    },

    addElement(type) {
      const currentSlide = this.activeSlide
      if (!currentSlide) return

      if (!currentSlide.elements) {
        currentSlide.elements = []
      }

      const newId = `elem-${Date.now()}`
      const defaultZIndex = currentSlide.elements.length + 1

      let newElement = {
        id: newId,
        type,
        x: 150,
        y: 150,
        width: 200,
        height: 100,
        zIndex: defaultZIndex,
        action: {
          type: 'none',
          targetSlideId: '',
          url: ''
        }
      }

      if (type === 'text') {
        newElement = {
          ...newElement,
          width: 320,
          height: 60,
          text: 'Yeni Metin Buraya',
          fontSize: 20,
          fontColor: '#1e293b',
          fontBold: false,
          fontItalic: false,
          textAlign: 'left'
        }
      } else if (type === 'button') {
        newElement = {
          ...newElement,
          width: 180,
          height: 48,
          text: 'Etkileşimli Buton',
          fontSize: 15,
          fontColor: '#ffffff',
          bgColor: '#3b82f6',
          borderRadius: 8,
          action: {
            type: 'none',
            targetSlideId: '',
            url: ''
          }
        }
      } else if (type === 'shape') {
        newElement = {
          ...newElement,
          width: 160,
          height: 160,
          shapeType: 'rectangle', // rectangle, circle, pill
          fillColor: '#3b82f6',
          borderColor: '#1d4ed8',
          borderWidth: 2,
          borderRadius: 8
        }
      } else if (type === 'image') {
        newElement = {
          ...newElement,
          width: 300,
          height: 200,
          src: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60',
          objectFit: 'cover',
          borderRadius: 4
        }
      }

      currentSlide.elements.push(newElement)
      this.selectElement(newId)
    },

    updateElement(elementId, newProps) {
      const currentSlide = this.activeSlide
      if (!currentSlide) return
      const element = currentSlide.elements.find(el => el.id === elementId)
      if (element) {
        Object.assign(element, newProps)
      }
    },

    deleteElement(elementId) {
      const currentSlide = this.activeSlide
      if (!currentSlide) return
      const idx = currentSlide.elements.findIndex(el => el.id === elementId)
      if (idx !== -1) {
        currentSlide.elements.splice(idx, 1)
        if (this.selectedElementId === elementId) {
          this.selectedElementId = null
        }
      }
    },

    updateSlideBackground(color) {
      if (this.activeSlide) {
        this.activeSlide.background = color
      }
    },

    loadProject(projectData) {
      if (projectData.courseTitle !== undefined) {
        this.courseTitle = projectData.courseTitle
      }
      if (projectData.author !== undefined) {
        this.author = projectData.author
      }
      if (Array.isArray(projectData.slides)) {
        this.slides = JSON.parse(JSON.stringify(projectData.slides))
      }
      if (projectData.activeSlideId && this.slides.some(s => s.id === projectData.activeSlideId)) {
        this.activeSlideId = projectData.activeSlideId
      } else if (this.slides.length > 0) {
        this.activeSlideId = this.slides[0].id
      } else {
        this.activeSlideId = null
      }
      this.selectedElementId = null
    },

    resetProject() {
      this.courseTitle = 'Yeni E-Öğrenme Dersi'
      this.author = 'Eğitmen'
      this.slides = [
        {
          id: 'slide-1',
          type: 'content',
          title: 'Giriş Slaytı',
          background: '#ffffff',
          elements: [
            {
              id: 'elem-1',
              type: 'text',
              text: 'Ders Başlığına Hoş Geldiniz',
              x: 80,
              y: 80,
              width: 800,
              height: 60,
              fontSize: 32,
              fontColor: '#1e293b',
              fontBold: true,
              fontItalic: false,
              textAlign: 'center',
              zIndex: 1
            },
            {
              id: 'elem-2',
              type: 'text',
              text: 'Bu içerik web tabanlı SCORM içerik geliştirme aracı ile hazırlanmıştır.',
              x: 130,
              y: 180,
              width: 700,
              height: 80,
              fontSize: 20,
              fontColor: '#64748b',
              fontBold: false,
              fontItalic: false,
              textAlign: 'center',
              zIndex: 2
            }
          ]
        }
      ]
      this.activeSlideId = 'slide-1'
      this.selectedElementId = null
    }
  }
})

