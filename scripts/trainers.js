document.addEventListener('DOMContentLoaded', function() {
  const trainersLink = document.querySelector('a[href="#trainers"]');
  const becomeLink = document.querySelector('a[href="#become_trainer"]');
  const trainersSection = document.getElementById('trainers-section');
  const becomeSection = document.getElementById('become-trainer-section');
  const mainContent = document.getElementById('content');

  if (trainersLink && trainersSection && mainContent) {
    trainersLink.addEventListener('click', function(e) {
      e.preventDefault();
      mainContent.classList.add('hidden-content');
      trainersSection.classList.remove('hidden');
      setTimeout(() => { trainersSection.classList.add('active'); }, 10);
      setTimeout(() => { mainContent.style.display = 'none'; }, 600);
      document.body.classList.add('section-open');
      // Добавляем кнопки «Оставить отзыв» и логику модалки (один раз)
      if (!trainersSection.dataset.enhanced) {
        addReviewButtons();
        setupReviewModal();
        trainersSection.dataset.enhanced = '1';
      }
      
      // Обновляем секцию тренеров при открытии (с задержкой для загрузки функций)
      setTimeout(() => {
        if (typeof window.updateTrainersSection === 'function') {
          window.updateTrainersSection();
        }
        
        setTimeout(() => {
          addReviewButtons();
        }, 200);
      }, 100);
      
      // Прокрутка к началу секции, чтобы заголовок и верхние карточки были видны
      setTimeout(() => {
        try { 
          trainersSection.scrollTo({ top: 0, behavior: 'smooth' }); 
        } catch {}
        try { 
          window.scrollTo({ top: 0, behavior: 'smooth' }); 
        } catch {}
      }, 100);
    });
  }
  if (becomeLink && becomeSection && mainContent) {
    becomeLink.addEventListener('click', function(e) {
      e.preventDefault();
      mainContent.classList.add('hidden-content');
      becomeSection.classList.remove('hidden');
      setTimeout(() => { becomeSection.classList.add('active'); }, 10);
      setTimeout(() => { mainContent.style.display = 'none'; }, 600);
      document.body.classList.add('section-open');
    });
  }
  // Если секция видима напрямую
  if (becomeSection && !becomeSection.classList.contains('hidden')) {
    becomeSection.classList.add('active');
  }
  // На случай, если секция уже видима при загрузке (например, прямой переход)
  if (trainersSection && !trainersSection.classList.contains('hidden') && !trainersSection.dataset.enhanced) {
    addReviewButtons();
    setupReviewModal();
    trainersSection.dataset.enhanced = '1';
    try { trainersSection.scrollTop = 0; } catch {}
    
  }

  // Обновляем секцию тренеров при загрузке страницы, чтобы показать добавленных тренеров
  setTimeout(() => {
    if (typeof window.updateTrainersSection === 'function') {
      window.updateTrainersSection();
      
      // Добавляем кнопки отзывов после обновления
      setTimeout(() => {
        addReviewButtons();
      }, 200);
    }
  }, 1500);
});

function closeTrainers() {
  const trainersSection = document.getElementById('trainers-section');
  const mainContent = document.getElementById('content');

  if (!trainersSection || !mainContent) {
    console.error("Не найдены элементы для закрытия");
    return;
  }

  mainContent.style.display = '';
  trainersSection.classList.remove('active');

  setTimeout(() => {
    trainersSection.classList.add('hidden');
    mainContent.classList.remove('hidden-content');
    document.body.classList.remove('section-open');
  }, 600);
}


// ===== Отзывы и рейтинг тренеров =====
// Модальное окно
let reviewModalEl;
let reviewModalCloseBtn;
let reviewModalStarsWrap;
let reviewModalAvg;
let reviewModalTextarea;
let reviewModalSubmitBtn;
let reviewModalList;
let reviewModalPhoto;
let reviewModalName;
let reviewModalStarElems = [];
let reviewModalSelectedRating = 0;
let reviewModalTrainerId = '';

function setupReviewModal() {
  reviewModalEl = document.getElementById('reviewModal');
  if (!reviewModalEl) return;
  reviewModalCloseBtn = reviewModalEl.querySelector('.review-close');
  reviewModalStarsWrap = reviewModalEl.querySelector('.stars');
  reviewModalAvg = reviewModalEl.querySelector('.avg-rating');
  reviewModalTextarea = reviewModalEl.querySelector('.review-textarea');
  reviewModalSubmitBtn = reviewModalEl.querySelector('.review-submit-btn');
  reviewModalList = reviewModalEl.querySelector('.reviews-list');
  reviewModalPhoto = reviewModalEl.querySelector('.review-trainer-photo');
  reviewModalName = reviewModalEl.querySelector('.review-trainer-name');

  // Создаём 5 звёзд в модалке
  reviewModalStarsWrap.innerHTML = '';
  reviewModalStarElems = [];
  for (let i = 1; i <= 5; i += 1) {
    const s = document.createElement('span');
    s.className = 'star';
    s.dataset.value = String(i);
    s.textContent = '★';
    reviewModalStarElems.push(s);
    reviewModalStarsWrap.appendChild(s);
  }

  reviewModalStarElems.forEach((s) => {
    s.addEventListener('mouseenter', function() {
      paintStars(reviewModalStarElems, Number(this.dataset.value));
    });
    s.addEventListener('mouseleave', function() {
      paintStars(reviewModalStarElems, reviewModalSelectedRating);
    });
    s.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!ensureAuthOrOpenModal()) return;
      reviewModalSelectedRating = Number(this.dataset.value);
      paintStars(reviewModalStarElems, reviewModalSelectedRating);
    });
  });

  if (reviewModalCloseBtn) reviewModalCloseBtn.addEventListener('click', closeReviewModal);
  // Закрытие по клику на фон с защитой от случайного закрытия при перетаскивании
  let isReviewModalDragging = false;
  let reviewModalStartTarget = null;
  
  reviewModalEl.addEventListener('mousedown', function(e) {
    reviewModalStartTarget = e.target;
    isReviewModalDragging = false;
  });
  
  reviewModalEl.addEventListener('mousemove', function(e) {
    if (reviewModalStartTarget && e.target !== reviewModalStartTarget) {
      isReviewModalDragging = true;
    }
  });
  
  reviewModalEl.addEventListener('click', function(e) {
    if (e.target === reviewModalEl && !isReviewModalDragging) {
      closeReviewModal();
    }
    isReviewModalDragging = false;
    reviewModalStartTarget = null;
  });

  if (reviewModalSubmitBtn) reviewModalSubmitBtn.addEventListener('click', submitReviewFromModal);
}

function openReviewModalForCard(card) {
  if (!reviewModalEl) return;
  const trainerId = getTrainerIdFromCard(card);
  if (!trainerId) return;
  reviewModalTrainerId = trainerId;
  // Заголовок и фото
  const img = card.querySelector('img');
  const name = card.querySelector('h3');
  if (reviewModalPhoto) reviewModalPhoto.src = img ? img.src : '';
  if (reviewModalName) reviewModalName.textContent = name ? name.textContent : '';

  // Сброс состояния
  reviewModalSelectedRating = 0;
  paintStars(reviewModalStarElems, reviewModalSelectedRating);
  if (reviewModalTextarea) reviewModalTextarea.value = '';

  // Загрузка отзывов
  const map = readTrainerReviews();
  const arr = Array.isArray(map[trainerId]) ? map[trainerId] : [];
  renderReviewsList(reviewModalList, arr);
  renderAvg(reviewModalAvg, arr);

  reviewModalEl.classList.remove('hidden');
  reviewModalEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeReviewModal() {
  if (!reviewModalEl) return;
  reviewModalEl.classList.add('hidden');
  reviewModalEl.style.display = 'none';
  document.body.style.overflow = '';
}

function submitReviewFromModal(e) {
  e && e.preventDefault();
  if (!ensureAuthOrOpenModal()) return;
  const user = getCurrentUserSafe();
  const comment = (reviewModalTextarea && reviewModalTextarea.value || '').trim();
  if (!reviewModalTrainerId) return;
  if (!reviewModalSelectedRating) { showSafeToast('Поставьте оценку от 1 до 5'); return; }
  if (!comment) { showSafeToast('Напишите текст отзыва'); return; }
  const map = readTrainerReviews();
  const arr = Array.isArray(map[reviewModalTrainerId]) ? map[reviewModalTrainerId] : [];
  const idx = arr.findIndex(r => r.userId === user.id);
  const item = { userId: user.id, userName: user.name || user.email, rating: reviewModalSelectedRating, comment, date: new Date().toISOString() };
  if (idx !== -1) arr[idx] = item; else arr.push(item);
  map[reviewModalTrainerId] = arr;
  writeTrainerReviews(map);
  // Синхронизация с Supabase
  try { syncReviewWithSupabase({ user, trainerName: reviewModalTrainerId, rating: reviewModalSelectedRating, comment }); } catch {}
  // Обновить UI
  if (reviewModalTextarea) reviewModalTextarea.value = '';
  reviewModalSelectedRating = 0;
  paintStars(reviewModalStarElems, reviewModalSelectedRating);
  renderReviewsList(reviewModalList, arr);
  renderAvg(reviewModalAvg, arr);
  showSafeToast('Отзыв сохранён');
}

function addReviewButtons() {
  const cards = document.querySelectorAll('#trainers-section .trainer-card');
  cards.forEach((card) => {
    if (card.dataset.reviewBtn) return;
    card.dataset.reviewBtn = '1';
    const btn = document.createElement('button');
    btn.className = 'plan-button review-open-btn';
    btn.textContent = 'Оставить отзыв';
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const user = getCurrentUserSafe();
      if (!user) { showSafeToast('Чтобы оставить отзыв, войдите в аккаунт'); return; }
      openReviewModalForCard(card);
    });
    card.appendChild(btn);
  });
}
function getTrainerIdFromCard(card) {
  // Используем имя тренера как стабильный идентификатор
  const nameEl = card && card.querySelector('h3');
  return nameEl ? nameEl.textContent.trim() : '';
}

function readTrainerReviews() {
  try { return JSON.parse(localStorage.getItem('trainerReviews') || '{}'); } catch { return {}; }
}

function writeTrainerReviews(map) {
  localStorage.setItem('trainerReviews', JSON.stringify(map));
}

function getCurrentUserSafe() {
  try { return typeof getCurrentUser === 'function' ? getCurrentUser() : null; } catch { return null; }
}

function ensureAuthOrOpenModal() {
  const user = getCurrentUserSafe();
  if (!user) { try { showSafeToast('Войдите через кнопку «Войти» вверху'); } catch {} }
  return !!user;
}

// Карточечный UI больше не используется, заменён модальным окном

function paintStars(stars, value) {
  stars.forEach((s) => {
    const v = Number(s.dataset.value);
    if (v <= value) s.classList.add('filled'); else s.classList.remove('filled');
  });
}

function renderAvg(host, reviews) {
  if (!host) return;
  if (!reviews || !reviews.length) { host.textContent = 'Ещё нет оценок'; return; }
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  const avg = sum / reviews.length;
  host.textContent = `Средняя оценка: ${avg.toFixed(1)} (отзывов: ${reviews.length})`;
}

function renderReviewsList(host, reviews) {
  if (!host) return;
  host.innerHTML = '';
  if (!reviews || !reviews.length) {
    const empty = document.createElement('div');
    empty.className = 'review-empty';
    empty.textContent = 'Будьте первым, кто оставит отзыв';
    host.appendChild(empty);
    return;
  }
  reviews
    .slice() // копия
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((r) => {
      const item = document.createElement('div');
      item.className = 'review-item';
      const header = document.createElement('div');
      header.className = 'review-header';
      const name = document.createElement('span');
      name.className = 'review-author';
      name.textContent = r.userName || 'Пользователь';
      const rating = document.createElement('span');
      rating.className = 'review-rating';
      rating.textContent = '★'.repeat(Number(r.rating) || 0);
      // Кнопка удаления отзыва для админа
      if (isAdminUser()) {
        const del = document.createElement('button');
        del.className = 'admin-del-review';
        del.title = 'Удалить отзыв';
        del.textContent = 'Удалить';
        del.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          adminDeleteTrainerReview(reviewModalTrainerId, r.userId);
        });
        header.appendChild(del);
      }
      const text = document.createElement('div');
      text.className = 'review-text';
      text.textContent = r.comment || '';
      header.appendChild(name);
      header.appendChild(rating);
      item.appendChild(header);
      item.appendChild(text);
      host.appendChild(item);
    });
}

function isAdminUser() {
  try {
    const u = getCurrentUserSafe();
    if (!u) return false;
    const role = String(u.role || '').toLowerCase();
    const email = String(u.email || '').toLowerCase();
    if (role === 'admin') return true;
    if (role === 'manager') return true; // менеджер тоже может удалять отзывы
    if (email === 'purepulse676@gmail.com') return true;
    return false;
  } catch { return false; }
}

function adminDeleteTrainerReview(trainerId, reviewUserId) {
  const map = readTrainerReviews();
  const arr = Array.isArray(map[trainerId]) ? map[trainerId] : [];
  const idx = arr.findIndex(r => r.userId === reviewUserId);
  if (idx === -1) { showSafeToast('Отзыв не найден'); return; }
  arr.splice(idx, 1);
  map[trainerId] = arr;
  writeTrainerReviews(map);
  // Обновить UI модалки
  renderReviewsList(reviewModalList, arr);
  renderAvg(reviewModalAvg, arr);
  showSafeToast('Отзыв удалён');
  // Удалить в Supabase тоже
  try { deleteReviewFromSupabase({ trainerName: trainerId, reviewUserId }); } catch {}
}

async function syncReviewWithSupabase({ user, trainerName, rating, comment }) {
  if (!window.supabase) return;
  try {
    if (!user.supabaseId && typeof window.syncUserWithSupabase === 'function') {
      await window.syncUserWithSupabase(user);
    }
    const userId = user.supabaseId;
    if (!userId) return;
    // один отзыв на тренера: сперва попробуем upsert по (user_id, trainer_name)
    const existing = await supabase
      .from('trainer_reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('trainer_name', trainerName)
      .limit(1);
    if (existing.error) throw existing.error;
    if (existing.data && existing.data.length) {
      const id = existing.data[0].id;
      const upd = await supabase.from('trainer_reviews').update({ rating, comment }).eq('id', id);
      if (upd.error) throw upd.error;
    } else {
      const ins = await supabase.from('trainer_reviews').insert([{ user_id: userId, trainer_name: trainerName, rating, comment }]);
      if (ins.error) throw ins.error;
    }
  } catch (e) { console.warn('[supabase] sync review failed', e); }
}

async function deleteReviewFromSupabase({ trainerName, reviewUserId }) {
  if (!window.supabase) return;
  try {
  } catch (e) { console.warn('[supabase] delete review failed', e); }
}

function showSafeToast(msg) {
  try {
    if (typeof showToast === 'function') { showToast(msg); return; }
  } catch {}
  alert(msg);
}

// ===== Система ограничений заявок на тренера =====
let currentCaptchaCode = '';
let captchaModalEl;
let captchaImageEl;
let captchaInputEl;
let captchaErrorEl;
let captchaSubmitBtn;
let captchaRefreshBtn;
let captchaCloseBtn;

// Инициализация системы капчи
document.addEventListener('DOMContentLoaded', function() {
  // Настройка кнопки отправки заявки
  const submitBtn = document.getElementById('becomeTrainerSubmitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleBecomeTrainerSubmit);
  }

  // Инициализация модального окна капчи
  initCaptchaModal();
});

function handleBecomeTrainerSubmit(e) {
  e.preventDefault();
  
  // Проверяем, авторизован ли пользователь
  const user = getCurrentUserSafe();
  if (!user) {
    showSafeToast('Для подачи заявки необходимо войти в аккаунт');
    return;
  }
  if (!(window.isEmailVerified ? window.isEmailVerified(user) : (user && user.emailVerified))) {
    showSafeToast('Подтвердите e‑mail через ссылку в письме, чтобы отправлять заявки');
    return;
  }

  // Предвалидация полей формы до показа капчи
  try {
    const name = (document.getElementById('btName')?.value || '').trim();
    const expStr = (document.getElementById('btExperience')?.value || '').trim();
    const gym = (document.getElementById('btGym')?.value || '').trim();
    const phone = (document.getElementById('btPhone')?.value || '').trim();
    const about = (document.getElementById('btAbout')?.value || '').trim();
    const digits = phone.replace(/\D/g, '');

    if (!name) { showSafeToast('Укажите имя'); return; }
    if (!/^\d+$/.test(expStr)) { showSafeToast('Выберите стаж'); return; }
    const exp = Number(expStr); if (exp < 1 || exp > 10 || !Number.isFinite(exp)) { showSafeToast('Стаж должен быть от 1 до 10+ лет'); return; }
    if (!gym) { showSafeToast('Выберите зал'); return; }
    if (!digits || digits.length < 10 || digits.length > 15) { showSafeToast('Введите корректный телефон для связи'); return; }
    if (!about) { showSafeToast('Расскажите коротко о себе'); return; }
  } catch {}

  // Проверяем ограничение по времени (1 раз в неделю)
  if (isApplicationLimitReached(user.id)) {
    showSafeToast('Вы уже подавали заявку на тренера на этой неделе. Попробуйте через неделю.');
    return;
  }

  // Показываем модальное окно с капчей
  openCaptchaModal();
}

function isApplicationLimitReached(userId) {
  try {
    const applications = JSON.parse(localStorage.getItem('trainerApplications') || '{}');
    const userApplications = applications[userId] || [];
    
    // Проверяем заявки за последние 7 дней
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentApplications = userApplications.filter(app => {
      const appDate = new Date(app.date);
      return appDate >= oneWeekAgo;
    });
    
    return recentApplications.length > 0;
  } catch (error) {
    console.error('Ошибка проверки лимита заявок:', error);
    return false;
  }
}

function saveApplication(userId, formData) {
  try {
    const applications = JSON.parse(localStorage.getItem('trainerApplications') || '{}');
    const userApplications = applications[userId] || [];
    
    const application = {
      id: Date.now(),
      date: new Date().toISOString(),
      data: formData
    };
    
    userApplications.push(application);
    applications[userId] = userApplications;
    
    localStorage.setItem('trainerApplications', JSON.stringify(applications));
    return true;
  } catch (error) {
    console.error('Ошибка сохранения заявки:', error);
    return false;
  }
}

function initCaptchaModal() {
  captchaModalEl = document.getElementById('captchaModal');
  captchaImageEl = document.getElementById('captchaImage');
  captchaInputEl = document.getElementById('captchaInput');
  captchaErrorEl = document.getElementById('captchaError');
  captchaSubmitBtn = document.getElementById('captchaSubmit');
  captchaRefreshBtn = document.getElementById('captchaRefresh');
  captchaCloseBtn = document.querySelector('.captcha-close');

  if (!captchaModalEl) return;

  // Обработчики событий
  if (captchaRefreshBtn) {
    captchaRefreshBtn.addEventListener('click', generateCaptcha);
  }

  if (captchaSubmitBtn) {
    captchaSubmitBtn.addEventListener('click', submitApplicationWithCaptcha);
  }

  if (captchaCloseBtn) {
    captchaCloseBtn.addEventListener('click', closeCaptchaModal);
  }

  if (captchaInputEl) {
    captchaInputEl.addEventListener('input', function() {
      // Разрешаем только цифры
      this.value = this.value.replace(/[^0-9]/g, '');
      captchaErrorEl.textContent = '';
    });

    captchaInputEl.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        submitApplicationWithCaptcha();
      }
    });
  }

  // Закрытие по клику на фон
  captchaModalEl.addEventListener('click', function(e) {
    if (e.target === captchaModalEl) {
      closeCaptchaModal();
    }
  });
}

function openCaptchaModal() {
  if (!captchaModalEl) return;
  
  generateCaptcha();
  captchaModalEl.classList.remove('hidden');
  captchaModalEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  // Фокус на поле ввода
  setTimeout(() => {
    if (captchaInputEl) captchaInputEl.focus();
  }, 100);
}

function closeCaptchaModal() {
  if (!captchaModalEl) return;
  
  captchaModalEl.classList.add('hidden');
  captchaModalEl.style.display = 'none';
  document.body.style.overflow = '';
  
  // Очистка полей
  if (captchaInputEl) captchaInputEl.value = '';
  if (captchaErrorEl) captchaErrorEl.textContent = '';
}

function generateCaptcha() {
  // Генерируем 6-значный код
  currentCaptchaCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  if (captchaImageEl) {
    captchaImageEl.textContent = currentCaptchaCode;
  }
}

function submitApplicationWithCaptcha() {
  const userInput = captchaInputEl ? captchaInputEl.value.trim() : '';
  
  if (!userInput) {
    showCaptchaError('Введите код с картинки');
    return;
  }
  
  if (userInput.length !== 6) {
    showCaptchaError('Код должен содержать 6 цифр');
    return;
  }
  
  if (userInput !== currentCaptchaCode) {
    showCaptchaError('Неверный код. Попробуйте еще раз.');
    generateCaptcha(); // Генерируем новый код
    if (captchaInputEl) captchaInputEl.value = '';
    return;
  }
  
  // Код верный, отправляем заявку
  submitTrainerApplication();
}

function showCaptchaError(message) {
  if (captchaErrorEl) {
    captchaErrorEl.textContent = message;
  }
}

function submitTrainerApplication() {
  const user = getCurrentUserSafe();
  if (!user) {
    showSafeToast('Ошибка: пользователь не найден');
    return;
  }

  // Собираем данные формы
  const formData = {
    name: document.getElementById('btName')?.value || '',
    experience: document.getElementById('btExperience')?.value || '',
    gym: document.getElementById('btGym')?.value || '',
    phone: document.getElementById('btPhone')?.value || '',
    email: document.getElementById('btEmail')?.value || '',
    about: document.getElementById('btAbout')?.value || '',
    file: document.getElementById('btFile')?.files[0] || null
  };

  // Проверяем обязательные поля
  if (!formData.name || !formData.experience || !formData.phone || !formData.about) {
    showSafeToast('Заполните все обязательные поля');
    return;
  }

  // Сохраняем заявку
  if (saveApplication(user.id, formData)) {
    showSafeToast('Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.');
    closeCaptchaModal();
    
    // Закрываем секцию "Стать тренером" и возвращаем на главную
    closeBecomeTrainer();
    
    // Очищаем форму
    document.getElementById('becomeTrainerForm').reset();
    
    // Синхронизация с Supabase (если доступно) - в фоне, без блокировки
    syncApplicationWithSupabase(user, formData).catch(error => {
      console.warn('Ошибка синхронизации с Supabase:', error);
    });
  } else {
    showSafeToast('Ошибка при сохранении заявки. Попробуйте еще раз.');
  }
}

async function syncApplicationWithSupabase(user, formData) {
  if (!window.supabase) return;
  
  try {
    if (!user.supabaseId && typeof window.syncUserWithSupabase === 'function') {
      await window.syncUserWithSupabase(user);
    }
    
    const userId = user.supabaseId;
    if (!userId) return;

    const applicationData = {
      user_id: userId,
      name: formData.name,
      experience: parseInt(formData.experience),
      gym: formData.gym,
      phone: formData.phone,
      email: formData.email,
      about: formData.about,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('trainer_applications')
      .insert([applicationData]);

    if (error) {
      // 409 = Conflict (возможно, заявка уже существует)
      if (error.code === '23505' || error.message.includes('409') || error.message.includes('Conflict')) {
        console.warn('[supabase] Application might already exist in database');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.warn('[supabase] sync application failed', error);
  }
}

