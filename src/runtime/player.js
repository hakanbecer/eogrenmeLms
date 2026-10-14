    var currentSlideIndex = 0;
    var startTime = new Date();
    var isScormActive = false;
    var maxVisitedIndex = 0;
    // Quiz State: { [slideIndex]: { selected: 'A', isSubmitted: true, isCorrect: true } }
    var quizAnswers = {};

    function initPlayer() {
      // 1. SCORM LMS Bağlantısı (Try-catch ile tam güvenlik koruması)
      try {
        if (typeof pipwerks !== 'undefined' && pipwerks.SCORM) {
          isScormActive = pipwerks.SCORM.init();
          if (isScormActive) {
            var status = pipwerks.SCORM.get("cmi.core.lesson_status");
            if (status === "not attempted" || status === "unknown" || !status) {
              pipwerks.SCORM.set("cmi.core.lesson_status", "incomplete");
              pipwerks.SCORM.save();
              updateStatusBadge("incomplete");
            } else {
              updateStatusBadge(status);
            }

            var bookmark = pipwerks.SCORM.get("cmi.core.lesson_location");
            if (bookmark && !isNaN(parseInt(bookmark))) {
              var bIndex = parseInt(bookmark);
              if (bIndex >= 0 && window.COURSE_DATA && window.COURSE_DATA.slides && bIndex < window.COURSE_DATA.slides.length) {
                currentSlideIndex = bIndex;
              }
            }

            var prevScore = pipwerks.SCORM.get("cmi.core.score.raw");
            if (prevScore && !isNaN(parseInt(prevScore))) {
              updateScoreBadge(parseInt(prevScore));
            }
          }
        }
      } catch (err) {
        console.warn("[SCORM Init Warning]:", err);
      }

      // 2. Başlık ve İçerik Kontrolü
      try {
        if (window.COURSE_DATA) {
          var cTitle = window.COURSE_DATA.title || 'E-Öğrenme Dersi';
          var titleElem = document.getElementById('courseTitle');
          if (titleElem) titleElem.innerText = cTitle;
          document.title = cTitle;
          
          var hasQuizzes = (window.COURSE_DATA.slides || []).some(function(s) { return s.type === 'quiz'; });
          if (hasQuizzes) {
            var sBadge = document.getElementById('scoreBadge');
            if (sBadge) sBadge.style.display = 'inline-block';
          }
        }
      } catch (err) {
        console.warn("[Title Init Warning]:", err);
      }

      // 3. Boyutlandırma ve İlk Slayt Çizimi
      try {
        handleResize();
      } catch (err) {
        console.warn("[Resize Warning]:", err);
      }

      try {
        renderSlide();
      } catch (err) {
        console.error("[Render Slide Error]:", err);
      }

      // İframe boyutlarının gecikmeli oturması için 150ms ve 500ms tekrar kontrol
      setTimeout(handleResize, 150);
      setTimeout(handleResize, 500);
    }

    function handleResize() {
      var container = document.getElementById('viewportContainer');
      var scaler = document.getElementById('stageScaler');
      if (!container || !scaler) return;

      var cw = container.clientWidth || window.innerWidth || 960;
      var ch = container.clientHeight || (window.innerHeight - 112) || 540;

      // Minimum alan güvencesi
      var availW = Math.max(300, cw - 30);
      var availH = Math.max(200, ch - 30);

      var scale = Math.min(availW / 960, availH / 540);
      if (isNaN(scale) || scale <= 0.05) {
        scale = 0.5;
      }

      scaler.style.transform = 'scale(' + scale + ')';
    }

    window.addEventListener('resize', handleResize);

    // Skor ve Değerlendirme Hesaplama (SCORM cmi.core.score.raw)
    function calculateEvaluation() {
      var slides = (window.COURSE_DATA && window.COURSE_DATA.slides) || [];
      var quizSlides = slides.filter(function(s) { return s.type === 'quiz'; });
      if (quizSlides.length === 0) {
        return { hasQuizzes: false, allAnswered: true, score: 100, passed: true };
      }

      var totalEarned = 0;
      var maxTotal = 0;
      var allAnswered = true;

      quizSlides.forEach(function(s) {
        var sIndex = slides.indexOf(s);
        var ans = quizAnswers[sIndex];
        var points = (s.quiz && s.quiz.points) ? parseInt(s.quiz.points) : 100;
        maxTotal += points;
        if (ans && ans.isSubmitted) {
          if (ans.isCorrect) totalEarned += points;
        } else {
          allAnswered = false;
        }
      });

      var normalizedScore = maxTotal > 0 ? Math.round((totalEarned / maxTotal) * 100) : 0;
      var passed = (normalizedScore >= 80); // SCORM standart geçme barajı %80
      return {
        hasQuizzes: true,
        allAnswered: allAnswered,
        score: normalizedScore,
        passed: passed
      };
    }

    function renderSlide() {
      var slides = (window.COURSE_DATA && window.COURSE_DATA.slides) || [];
      var canvas = document.getElementById('slideCanvas');
      if (!canvas) return;

      if (slides.length === 0) {
        canvas.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:50px;font-size:18px;">Ders içeriği bulunamadı.</div>';
        return;
      }

      if (currentSlideIndex < 0) currentSlideIndex = 0;
      if (currentSlideIndex >= slides.length) currentSlideIndex = slides.length - 1;

      var slide = slides[currentSlideIndex];
      canvas.style.backgroundColor = slide.background || '#ffffff';
      canvas.innerHTML = '';

      if (slide.type === 'quiz' && slide.quiz) {
        renderQuizSlide(slide, canvas);
      } else {
        renderContentSlide(slide, canvas);
      }

      // Kontrolleri güncelle
      var pBtn = document.getElementById('prevBtn');
      var nBtn = document.getElementById('nextBtn');
      var cElem = document.getElementById('slideCounter');
      var fElem = document.getElementById('progressFill');

      if (pBtn) pBtn.disabled = (currentSlideIndex === 0);
      if (nBtn) {
        if (currentSlideIndex === slides.length - 1) {
          nBtn.innerText = 'Dersi Bitir ✓';
        } else {
          nBtn.innerText = 'Sonraki ❯';
        }
      }

      if (cElem) cElem.innerText = 'Slayt ' + (currentSlideIndex + 1) + ' / ' + slides.length;
      if (fElem) {
        var progress = ((currentSlideIndex + 1) / slides.length) * 100;
        fElem.style.width = progress + '%';
      }

      // Takip & SCORM Yer İmi (Location) Güncellemesi
      if (currentSlideIndex > maxVisitedIndex) {
        maxVisitedIndex = currentSlideIndex;
      }

      if (isScormActive) {
        try {
          pipwerks.SCORM.set("cmi.core.lesson_location", String(currentSlideIndex));
          pipwerks.SCORM.save();
        } catch (e) {}
      }
    }

    function renderContentSlide(slide, canvas) {
      var elements = slide.elements || [];
      elements.forEach(function(el) {
        var div = document.createElement('div');
        div.className = 'stage-element';
        div.style.left = (el.x || 0) + 'px';
        div.style.top = (el.y || 0) + 'px';
        div.style.width = (el.width || 100) + 'px';
        div.style.height = (el.height || 50) + 'px';
        div.style.zIndex = el.zIndex || 1;

        if (el.type === 'text') {
          var textDiv = document.createElement('div');
          textDiv.className = 'element-text';
          textDiv.innerText = el.text || '';
          textDiv.style.fontSize = (el.fontSize || 18) + 'px';
          textDiv.style.color = el.fontColor || '#000000';
          textDiv.style.fontWeight = el.fontBold ? 'bold' : 'normal';
          textDiv.style.fontStyle = el.fontItalic ? 'italic' : 'normal';
          textDiv.style.textAlign = el.textAlign || 'left';
          div.appendChild(textDiv);
        } else if (el.type === 'button') {
          var btnDiv = document.createElement('div');
          btnDiv.className = 'stage-button';
          btnDiv.innerText = el.text || 'Buton';
          btnDiv.style.fontSize = (el.fontSize || 15) + 'px';
          btnDiv.style.color = el.fontColor || '#ffffff';
          btnDiv.style.backgroundColor = el.bgColor || '#3b82f6';
          btnDiv.style.borderRadius = (el.borderRadius || 6) + 'px';
          div.appendChild(btnDiv);
        } else if (el.type === 'shape') {
          var shapeDiv = document.createElement('div');
          shapeDiv.className = 'element-shape';
          shapeDiv.style.backgroundColor = el.fillColor || '#3b82f6';
          shapeDiv.style.borderColor = el.borderColor || '#1d4ed8';
          shapeDiv.style.borderWidth = (el.borderWidth || 0) + 'px';
          shapeDiv.style.borderStyle = 'solid';
          shapeDiv.style.borderRadius = el.shapeType === 'circle' ? '50%' : ((el.borderRadius || 0) + 'px');
          div.appendChild(shapeDiv);
        } else if (el.type === 'image') {
          var imgDiv = document.createElement('div');
          imgDiv.className = 'element-image';
          imgDiv.style.width = '100%';
          imgDiv.style.height = '100%';
          var img = document.createElement('img');
          if (el.src) img.src = el.src;
          img.style.objectFit = el.objectFit || 'cover';
          img.style.borderRadius = (el.borderRadius || 0) + 'px';
          imgDiv.appendChild(img);
          div.appendChild(imgDiv);
        }

        // Tetikleyici / Eylem (Trigger Action)
        if (el.action && el.action.type && el.action.type !== 'none') {
          div.classList.add('has-trigger');
          div.onclick = (function(act) {
            return function(e) {
              e.stopPropagation();
              executeTrigger(act);
            };
          })(el.action);
        }

        canvas.appendChild(div);
      });
    }

    function executeTrigger(action) {
      if (!action || action.type === 'none') return;
      if (action.type === 'jumpToSlide' && action.targetSlideId) {
        var slides = (window.COURSE_DATA && window.COURSE_DATA.slides) || [];
        var targetIndex = -1;
        for (var i = 0; i < slides.length; i++) {
          if (slides[i].id === action.targetSlideId) {
            targetIndex = i;
            break;
          }
        }
        if (targetIndex !== -1) {
          currentSlideIndex = targetIndex;
          renderSlide();
        }
      } else if (action.type === 'openUrl' && action.url) {
        var url = action.url.trim();
        if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
          url = 'https://' + url;
        }
        window.open(url, '_blank');
      }
    }

    function renderQuizSlide(slide, canvas) {
      var quiz = slide.quiz;
      var existingAns = quizAnswers[currentSlideIndex] || { selected: null, isSubmitted: false, isCorrect: false };

      var wrapper = document.createElement('div');
      wrapper.className = 'quiz-view-wrapper';

      var card = document.createElement('div');
      card.className = 'player-quiz-card';

      // Header
      var header = document.createElement('div');
      header.className = 'quiz-card-header';
      header.innerHTML = '<span class="quiz-pill">TEST SORUSU</span><span class="quiz-points">' + (quiz.points || 100) + ' Puan</span>';
      card.appendChild(header);

      // Soru Metni
      var q = document.createElement('h2');
      q.className = 'player-quiz-question';
      q.innerText = quiz.question || '';
      card.appendChild(q);

      // Şıklar
      var optContainer = document.createElement('div');
      optContainer.className = 'player-quiz-options';

      var options = quiz.options || [];
      options.forEach(function(opt) {
        var optDiv = document.createElement('div');
        optDiv.className = 'player-opt-item';
        if (existingAns.selected === opt.id) optDiv.classList.add('selected');
        if (existingAns.isSubmitted) {
          optDiv.classList.add('disabled');
          if (opt.id === quiz.correctAnswer) optDiv.classList.add('is-correct');
          else if (existingAns.selected === opt.id && !existingAns.isCorrect) optDiv.classList.add('is-wrong');
        }

        var optKey = document.createElement('div');
        optKey.className = 'player-opt-key';
        optKey.innerText = opt.id;

        var optText = document.createElement('div');
        optText.className = 'player-opt-text';
        optText.innerText = opt.text;

        optDiv.appendChild(optKey);
        optDiv.appendChild(optText);

        if (existingAns.isSubmitted) {
          if (opt.id === quiz.correctAnswer) {
            var tag = document.createElement('span');
            tag.className = 'player-opt-tag correct';
            tag.innerText = 'Doğru ✓';
            optDiv.appendChild(tag);
          } else if (existingAns.selected === opt.id && !existingAns.isCorrect) {
            var tagW = document.createElement('span');
            tagW.className = 'player-opt-tag wrong';
            tagW.innerText = 'Yanlış ✕';
            optDiv.appendChild(tagW);
          }
        }

        optDiv.onclick = function() {
          if (existingAns.isSubmitted) return;
          existingAns.selected = opt.id;
          quizAnswers[currentSlideIndex] = existingAns;
          renderSlide();
        };

        optContainer.appendChild(optDiv);
      });

      card.appendChild(optContainer);

      // Cevapla / Geri Bildirim Alanı
      var actionBar = document.createElement('div');
      actionBar.className = 'player-quiz-action-bar';

      if (!existingAns.isSubmitted) {
        var submitBtn = document.createElement('button');
        submitBtn.className = 'player-btn-submit';
        submitBtn.innerText = 'Cevapla';
        submitBtn.disabled = !existingAns.selected;
        submitBtn.onclick = function() {
          if (!existingAns.selected) return;
          var isCorrect = (existingAns.selected === quiz.correctAnswer);
          existingAns.isSubmitted = true;
          existingAns.isCorrect = isCorrect;
          quizAnswers[currentSlideIndex] = existingAns;

          // SCORM LMS Puan ve Durum Güncellemesi
          syncQuizWithScorm();
          renderSlide();
        };
        actionBar.appendChild(submitBtn);
      } else {
        var banner = document.createElement('div');
        banner.className = 'player-feedback-banner ' + (existingAns.isCorrect ? 'correct' : 'wrong');
        var msg = existingAns.isCorrect
          ? '✓ ' + (quiz.feedbackCorrect || 'Tebrikler! Doğru cevap.')
          : '✕ ' + (quiz.feedbackIncorrect || 'Maalesef yanlış cevap.');
        
        banner.innerHTML = '<span>' + msg + '</span>' + (!existingAns.isCorrect ? '<span class="player-correct-hint">Doğru Cevap: ' + quiz.correctAnswer + '</span>' : '');
        actionBar.appendChild(banner);
      }

      card.appendChild(actionBar);
      wrapper.appendChild(card);
      canvas.appendChild(wrapper);
    }

    // SCORM API Wrapper ile Puan ve Geçti/Kaldı Durumunu Senkronize Etme
    function syncQuizWithScorm() {
      var evalResult = calculateEvaluation();
      updateScoreBadge(evalResult.score);

      if (isScormActive) {
        try {
          pipwerks.SCORM.set("cmi.core.score.raw", String(evalResult.score));
          pipwerks.SCORM.set("cmi.core.score.min", "0");
          pipwerks.SCORM.set("cmi.core.score.max", "100");

          if (evalResult.allAnswered) {
            var finalStatus = evalResult.passed ? "passed" : "failed";
            pipwerks.SCORM.set("cmi.core.lesson_status", finalStatus);
            updateStatusBadge(finalStatus);
          } else {
            pipwerks.SCORM.set("cmi.core.lesson_status", "incomplete");
            updateStatusBadge("incomplete");
          }

          pipwerks.SCORM.save();
        } catch (e) {}
      }
    }

    function prevSlide() {
      if (currentSlideIndex > 0) {
        currentSlideIndex--;
        renderSlide();
      }
    }

    function nextSlide() {
      var slides = (window.COURSE_DATA && window.COURSE_DATA.slides) || [];
      if (currentSlideIndex < slides.length - 1) {
        currentSlideIndex++;
        renderSlide();
      } else {
        // Dersi Bitir / Tamamla
        var evalResult = calculateEvaluation();
        updateScoreBadge(evalResult.score);

        if (isScormActive) {
          try {
            if (evalResult.hasQuizzes) {
              pipwerks.SCORM.set("cmi.core.score.raw", String(evalResult.score));
              pipwerks.SCORM.set("cmi.core.score.min", "0");
              pipwerks.SCORM.set("cmi.core.score.max", "100");
              var finalStatus = evalResult.passed ? "passed" : "failed";
              pipwerks.SCORM.set("cmi.core.lesson_status", finalStatus);
              updateStatusBadge(finalStatus);
            } else {
              pipwerks.SCORM.set("cmi.core.lesson_status", "completed");
              pipwerks.SCORM.set("cmi.core.score.raw", "100");
              updateStatusBadge("completed");
            }
            pipwerks.SCORM.save();
          } catch (e) {}
        }

        if (evalResult.hasQuizzes) {
          if (evalResult.passed) {
            alert('Tebrikler! Testi başarıyla geçtiniz. Puanınız: ' + evalResult.score + ' / 100');
          } else {
            alert('Ders tamamlandı. Sınav puanınız: ' + evalResult.score + ' / 100 (Geçme barajı: %80)');
          }
        } else {
          alert('Tebrikler! Dersi başarıyla tamamladınız.');
        }
      }
    }

    function updateScoreBadge(score) {
      var badge = document.getElementById('scoreBadge');
      if (badge) {
        badge.style.display = 'inline-block';
        badge.innerText = 'Puan: ' + score + ' / 100';
      }
    }

    function updateStatusBadge(status) {
      var badge = document.getElementById('statusBadge');
      if (!badge) return;
      badge.className = 'status-badge ' + status;
      if (status === 'passed') {
        badge.innerText = 'Başarılı (Geçti) ✓';
      } else if (status === 'failed') {
        badge.innerText = 'Kaldı ✕';
      } else if (status === 'completed') {
        badge.innerText = 'Tamamlandı ✓';
      } else if (status === 'incomplete') {
        badge.innerText = 'Devam Ediyor...';
      }
    }

    function formatScormTime(ms) {
      var totalSec = Math.floor(ms / 1000);
      var hours = Math.floor(totalSec / 3600);
      var minutes = Math.floor((totalSec % 3600) / 60);
      var seconds = totalSec % 60;
      return (
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0')
      );
    }

    function handleExit() {
      if (isScormActive) {
        try {
          var elapsed = new Date() - startTime;
          pipwerks.SCORM.set("cmi.core.session_time", formatScormTime(elapsed));
          pipwerks.SCORM.save();
          pipwerks.SCORM.quit();
        } catch (e) {}
      }
    }

    window.addEventListener('beforeunload', handleExit);
    window.addEventListener('pagehide', handleExit);

    // Hazır olduğunda başlat
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPlayer);
    } else {
      initPlayer();
    }
    window.addEventListener('load', function() {
      handleResize();
      var canvas = document.getElementById('slideCanvas');
      if (canvas && canvas.innerText && canvas.innerText.indexOf('yükleniyor') !== -1) {
        initPlayer();
      }
    });