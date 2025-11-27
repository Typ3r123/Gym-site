const TRAINER_SCHEDULE_STORAGE_KEY = 'trainerSchedules';
const TRAINER_SCHEDULE_MIN_DAYS = 10;
const TRAINER_SCHEDULE_WINDOW_DAYS = 60; // Текущий месяц + следующий месяц
const TRAINER_SCHEDULE_MAX_SLOTS_PER_DAY = 6;
const TRAINER_SCHEDULE_SLOT_DURATION_HOURS = 2;
const TRAINER_SCHEDULE_AVAILABLE_TIMES = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

document.addEventListener('DOMContentLoaded', function() {
  const profileLink = document.getElementById('profileLink');
  const profileSection = document.getElementById('profile-section');
  const mainContent = document.getElementById('content');
  const avatarInput = document.getElementById('avatarInput');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileNameInput = document.getElementById('profileName');
  const saveNameBtn = document.getElementById('saveNameBtn');
  const profileGender = document.getElementById('profileGender');
  const saveGenderBtn = document.getElementById('saveGenderBtn');
  const profilePhone = document.getElementById('profilePhone');
  const savePhoneBtn = document.getElementById('savePhoneBtn');
  const profileEmail = document.getElementById('profileEmail');
  const verifyEmailBtn = document.getElementById('verifyEmailBtn');
  const emailVerifyStatus = document.getElementById('emailVerifyStatus');
  const bookBtn = document.getElementById('bookTrainingBtn');
  const myBookingsBtn = document.getElementById('myBookingsBtn');
  const trainerClientsBtn = document.getElementById('trainerClientsBtn');
  const manageTrainerScheduleBtn = document.getElementById('manageTrainerScheduleBtn');

  if (profileLink && profileSection && mainContent) {
    profileLink.addEventListener('click', function(e) {
      e.preventDefault();
      // Инициализация анимации при открытии профиля
      if (typeof initProfileAnimation === 'function') {
        setTimeout(initProfileAnimation, 50);
      }
      if (!getCurrentUser()) { openAuthModal(); return; }
      mainContent.classList.add('hidden-content');
      profileSection.classList.remove('hidden');
      setTimeout(() => { profileSection.classList.add('active'); }, 10);
      setTimeout(() => { mainContent.style.display = 'none'; }, 600);
      document.body.classList.add('section-open');
      document.body.classList.add('profile-open');
      renderProfile();
    });
  }

  if (saveNameBtn) {
    saveNameBtn.addEventListener('click', function() {
      const user = getCurrentUser();
      if (!user) return openAuthModal();
      const newName = profileNameInput.value.trim();
      if (!window.isValidName ? (newName.length < 2) : !window.isValidName(newName)) { showToast('Имя: только буквы (без цифр и спецсимволов)'); return; }
      user.name = newName;
      setCurrentUser(user);
      const users = readUsers();
      const idx = users.findIndex(u => u.id === user.id);
      if (idx !== -1) { users[idx].name = newName; writeUsers(users); }
      if (typeof updateAuthLinkUI === 'function') updateAuthLinkUI();
      showToast('Имя сохранено');
      try { saveUserFieldsToSupabase(user, { name: newName }); } catch {}
    });
  }

  if (saveGenderBtn) {
    saveGenderBtn.addEventListener('click', function() {
      const user = getCurrentUser();
      if (!user) return openAuthModal();
      const value = (profileGender && profileGender.value) || '';
      user.gender = value;
      setCurrentUser(user);
      const users = readUsers();
      const idx = users.findIndex(u => u.id === user.id);
      if (idx !== -1) { users[idx].gender = value; writeUsers(users); }
      showToast('Пол сохранён');
      try { saveUserFieldsToSupabase(user, { gender: value || null }); } catch {}
    });
  }

  if (savePhoneBtn) {
    savePhoneBtn.addEventListener('click', function() {
      const user = getCurrentUser();
      if (!user) return openAuthModal();
      const raw = (profilePhone && profilePhone.value || '').trim();
      const phone = normalizePhone(raw);
      if (!phone) { showToast('Введите корректный номер телефона'); return; }
      user.phone = phone;
      setCurrentUser(user);
      const users = readUsers();
      const idx = users.findIndex(u => u.id === user.id);
      if (idx !== -1) { users[idx].phone = phone; writeUsers(users); }
      showToast('Телефон сохранён');
      try { saveUserFieldsToSupabase(user, { phone }); } catch {}
    });
  }

  // Открытие модалки записи
  if (bookBtn) {
    bookBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openBookModal();
    });
  }
  if (myBookingsBtn) {
    myBookingsBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openBookingsModal();
    });
  }

  if (trainerClientsBtn) {
    trainerClientsBtn.dataset.baseText = trainerClientsBtn.textContent;
    trainerClientsBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openTrainerClientsModal();
    });
  }

  if (manageTrainerScheduleBtn) {
    manageTrainerScheduleBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openTrainerScheduleModal();
    });
  }

  const trainerNotificationsClearBtn = document.getElementById('trainerNotificationsClearBtn');
  if (trainerNotificationsClearBtn) {
    trainerNotificationsClearBtn.addEventListener('click', function(e) {
      e.preventDefault();
      clearTrainerNotifications();
    });
  }

  // Обработчик для кнопки проверки заявок
  const checkApplicationsBtn = document.getElementById('checkApplicationsBtn');
  if (checkApplicationsBtn) {
    checkApplicationsBtn.addEventListener('click', function() {
      renderTrainerApplications();
    });
  }

  // Маска и ограничение длины для телефона: +375 (XX) XXX-XX-XX
  if (profilePhone) {
    profilePhone.setAttribute('inputmode', 'numeric');
    profilePhone.setAttribute('maxlength', '19'); // +375 (99) 999-99-99

    const formatBelarusPhone = (value) => {
      const digits = String(value || '').replace(/\D+/g, '').slice(0, 12); // максимум 12 цифр с кодом 375
      let d = digits;
      if (d.startsWith('80') && d.length >= 2) d = '375' + d.slice(2);
      if (!d.startsWith('375')) {
        // Пользователь набирает локальный номер — добавим 375 в начале
        if (d.length > 9) d = d.slice(-9);
        d = '375' + d;
      }
      const core = d.slice(3, 12); // 9 цифр локальной части
      const c = core.padEnd(9, '');
      const p1 = c.slice(0, 2);
      const p2 = c.slice(2, 5);
      const p3 = c.slice(5, 7);
      const p4 = c.slice(7, 9);
      let out = '+375';
      if (p1) out += ` (${p1}`;
      if (p1 && p1.length === 2) out += ')';
      if (p2) out += (p1.length === 2 ? ` ${p2}` : '');
      if (p3) out += `-${p3}`;
      if (p4) out += `-${p4}`;
      return out;
    };

    const onPhoneInput = (e) => {
      const caretEnd = e.target.selectionEnd;
      const before = e.target.value;
      const formatted = formatBelarusPhone(before);
      e.target.value = formatted;
      // Ставим курсор в конец, чтобы не прыгал
      try { e.target.setSelectionRange(formatted.length, formatted.length); } catch {}
    };

    profilePhone.addEventListener('input', onPhoneInput);
    profilePhone.addEventListener('blur', function() {
      // На блюре проверить валидность
      const phone = normalizePhone(profilePhone.value);
      if (!phone) { showToast('Введите телефон в формате +375 (XX) XXX-XX-XX'); }
    });
  }

  if (avatarInput) {
    avatarInput.addEventListener('change', function() {
      const file = this.files && this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        const dataUrl = e.target.result;
        profileAvatar.style.backgroundImage = `url('${dataUrl}')`;
        const user = getCurrentUser();
        if (!user) return;
        user.avatarDataUrl = dataUrl;
        setCurrentUser(user);
        const users = readUsers();
        const idx = users.findIndex(u => u.id === user.id);
        if (idx !== -1) { users[idx].avatarDataUrl = dataUrl; writeUsers(users); }
        showToast('Аватар обновлён');
        try { saveUserFieldsToSupabase(user, { avatar_url: dataUrl }); } catch {}
      };
      reader.readAsDataURL(file);
    });
  }
});

function isTrainerUser(user) {
  const roles = (user && Array.isArray(user.roles)) ? user.roles : [];
  if (Array.isArray(roles) && roles.includes('trainer')) return true;
  const roleStr = String(user && user.role || '').toLowerCase();
  return !!(user && (user.isTrainer || roleStr === 'trainer'));
}

function collectTrainerBookings(trainerUser) {
  const result = [];
  if (!trainerUser) return result;
  const trainerName = String(trainerUser.name || '').trim();
  const trainerEmail = String(trainerUser.email || '').trim().toLowerCase();
  if (!trainerName) return result;
  const users = readUsers();
  users.forEach((client) => {
    const bookings = Array.isArray(client.bookings) ? client.bookings : [];
    bookings.forEach((booking) => {
      const trainerField = String(booking.trainer || '').trim();
      const bookingEmail = String(booking.trainerEmail || '').trim().toLowerCase();
      const matchesName = trainerField && trainerField.toLowerCase() === trainerName.toLowerCase();
      const matchesEmail = trainerEmail && bookingEmail && trainerEmail === bookingEmail;
      if (matchesName || matchesEmail) {
        result.push({ user: client, booking });
      }
    });
  });
  result.sort((a, b) => {
    const ad = Date.parse(`${a.booking.date || ''}T${a.booking.time || '00:00'}`) || 0;
    const bd = Date.parse(`${b.booking.date || ''}T${b.booking.time || '00:00'}`) || 0;
    return ad - bd;
  });
  return result;
}

function renderProfile() {
  const user = getCurrentUser();
  if (!user) return;
  const profileEmail = document.getElementById('profileEmail');
  const profileNameInput = document.getElementById('profileName');
  const profileAvatar = document.getElementById('profileAvatar');
  const profilePlans = document.getElementById('profilePlans');
  const profileGender = document.getElementById('profileGender');
  const profilePhone = document.getElementById('profilePhone');
  if (!profileEmail || !profileNameInput || !profilePlans) return;
  profileEmail.textContent = user.email || '';
  // Показ статуса верификации и кнопки
  try {
    const isVerified = !!(user && user.emailVerified === true);
    if (emailVerifyStatus) {
      emailVerifyStatus.style.display = '';
      emailVerifyStatus.textContent = isVerified ? 'E‑mail подтверждён' : 'E‑mail не подтверждён';
      emailVerifyStatus.style.background = isVerified ? '#13c2c2' : '#faad14';
    }
    if (verifyEmailBtn) {
      verifyEmailBtn.style.display = isVerified ? 'none' : '';
      verifyEmailBtn.onclick = function() { resendVerificationEmail(user); };
    }
  } catch {}
  profileNameInput.value = user.name || '';
  if (user.avatarDataUrl) profileAvatar.style.backgroundImage = `url('${user.avatarDataUrl}')`;
  if (profileGender) profileGender.value = user.gender || '';
  if (profilePhone) profilePhone.value = user.phone || '';
  const trainerBtn = document.getElementById('trainerClientsBtn');
  if (trainerBtn) {
    trainerBtn.style.display = isTrainerUser(user) ? '' : 'none';
  }
  renderUserPlans();
  renderTrainerApplications();
  // Показ расписания тренера, если есть роль
  try { renderTrainerSchedule(); } catch {}
  try { renderTrainerAvailabilitySummary(); } catch {}
  try { renderTrainerNotifications(); } catch {}
  // История посещений
  try { renderVisitHistory(); } catch {}
}

// Отправка письма подтверждения (повторно)
function resendVerificationEmail(user) {
  if (!user || !user.email) { try { showToast('Нет e‑mail для подтверждения'); } catch {} return; }
  try {
    // Сгенерировать/обновить токен и срок действия на 24 часа
    const token = typeof generateVerificationToken === 'function' ? generateVerificationToken() : (String(Math.random()).slice(2) + Date.now());
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    user.verificationToken = token;
    user.verificationExpiresAt = expiresAt;
    // Сохранить в users
    const list = readUsers();
    const idx = list.findIndex(u => u.id === user.id);
    if (idx !== -1) { list[idx] = user; writeUsers(list); }
    // Обновить currentUser
    setCurrentUser(user);
    // Сформировать ссылку и отправить письмо
    const link = (typeof buildVerificationLink === 'function') ? buildVerificationLink(user.id, token) : '';
    if (typeof sendRegistrationEmail === 'function') {
      sendRegistrationEmail({ toEmail: user.email, toName: user.name || user.email, verifyLink: link });
      try { showToast('Письмо с подтверждением отправлено'); } catch {}
    } else {
      try { showToast('Письмо не отправлено: нет интеграции Email'); } catch {}
    }
  } catch (e) {
    console.warn('resendVerificationEmail failed', e);
    try { showToast('Не удалось отправить письмо'); } catch {}
  }
}

// ===== Расписание тренера (записи ко мне) =====
function createAvatarElement(user, className) {
  const avatar = document.createElement('div');
  avatar.className = className;
  const img = user && user.avatarDataUrl;
  if (img) {
    avatar.style.backgroundImage = `url('${img}')`;
    avatar.textContent = '';
  } else {
    const seed = String(user && (user.name || user.email) || 'U').trim();
    avatar.textContent = seed ? seed.slice(0, 2).toUpperCase() : 'U';
  }
  return avatar;
}

function renderTrainerSchedule() {
  const me = getCurrentUser();
  const block = document.getElementById('trainerScheduleBlock');
  const host = document.getElementById('trainerSchedule');
  if (!block || !host) { renderTrainerAvailabilitySummary(); return; }
  if (!isTrainerUser(me)) { block.style.display = 'none'; host.innerHTML=''; renderTrainerAvailabilitySummary(); return; }
  block.style.display = '';
  host.innerHTML = '';
  const list = collectTrainerBookings(me);
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'bookings-empty';
    empty.textContent = 'Записей к вам пока нет';
    host.appendChild(empty);
    return;
  }
  const statusLabels = { planned: 'запланирована', scheduled: 'запланирована', completed: 'завершена', done: 'завершена', cancelled: 'отменена' };
  list.forEach(({ user, booking }) => {
    const card = document.createElement('div');
    card.className = 'trainer-booking-card';

    const avatar = createAvatarElement(user, 'trainer-booking-avatar');

    const body = document.createElement('div');
    body.className = 'trainer-booking-body';

    const title = document.createElement('div');
    title.className = 'trainer-booking-name';
    title.textContent = user.name || user.email || 'Пользователь';

    const contact = document.createElement('div');
    contact.className = 'trainer-booking-contact';
    const contacts = [];
    if (user.email) contacts.push(user.email);
    if (user.phone) contacts.push(user.phone);
    contact.textContent = contacts.length ? contacts.join(' • ') : 'Контакты не указаны';

    const meta = document.createElement('div');
    meta.className = 'trainer-booking-meta';
    const dateStr = `${booking.date || '-'} ${booking.time || ''}`.trim();
    const status = statusLabels[booking.status] || booking.status || 'статус неизвестен';
    const pieces = [];
    if (dateStr) pieces.push(dateStr);
    if (booking.gym) pieces.push(formatGym(booking.gym));
    pieces.push(`Статус: ${status}`);
    meta.textContent = pieces.join(' • ');

    const notes = document.createElement('div');
    let hasNotes = false;
    if (booking.notes) {
      notes.className = 'trainer-booking-notes';
      notes.textContent = `Пожелания: ${booking.notes}`;
      hasNotes = true;
    }

    body.appendChild(title);
    body.appendChild(contact);
    body.appendChild(meta);
    if (hasNotes) body.appendChild(notes);

    card.appendChild(avatar);
    card.appendChild(body);
    host.appendChild(card);
  });
  renderTrainerAvailabilitySummary();
}

function renderTrainerAvailabilitySummary() {
  const statsEl = document.getElementById('trainerScheduleStats');
  const listEl = document.getElementById('trainerAvailabilityList');
  const block = document.getElementById('trainerScheduleBlock');
  if (!statsEl || !listEl || !block) return;
  const user = getCurrentUser();
  if (!user || !isTrainerUser(user)) {
    statsEl.textContent = 'Расписание доступно только для тренеров';
    listEl.innerHTML = '';
    return;
  }
  const schedule = getTrainerScheduleForUser(user);
  const upcoming = filterFutureScheduleDays(schedule && schedule.days ? schedule.days : []);
  if (!upcoming.length) {
    statsEl.textContent = 'Расписание ещё не настроено';
    listEl.innerHTML = '<div class="trainer-availability-empty">Нажмите «Настроить расписание», чтобы указать рабочие дни.</div>';
    return;
  }
  statsEl.textContent = `Рабочих дней: ${upcoming.length}`;
  listEl.innerHTML = upcoming.slice(0, 10).map(day => {
    const slots = Array.isArray(day.slots) ? day.slots : [];
    const slotsText = slots.length > 0 ? slots.join(', ') : (day.start && day.end ? `${day.start} — ${day.end}` : 'Не указано');
    return `<div class="trainer-availability-item">
      <div class="trainer-availability-day">${formatDateHuman(day.date)}</div>
      <div class="trainer-availability-hours">${slotsText}</div>
    </div>`;
  }).join('');
}

function initTrainerScheduleModal() {
  if (trainerScheduleModalEl) return;
  trainerScheduleModalEl = document.getElementById('trainerScheduleModal');
  if (!trainerScheduleModalEl) return;
  trainerScheduleInfoEl = document.getElementById('trainerScheduleInfo');
  trainerScheduleSaveBtn = document.getElementById('trainerScheduleSaveBtn');
  trainerScheduleCancelBtn = document.getElementById('trainerScheduleCancelBtn');
  trainerScheduleMonthLabelEl = document.getElementById('trainerScheduleMonthLabel');
  trainerSchedulePrevBtn = document.getElementById('trainerSchedulePrevMonth');
  trainerScheduleNextBtn = document.getElementById('trainerScheduleNextMonth');
  trainerScheduleCalendarDaysEl = document.getElementById('trainerScheduleCalendarDays');
  trainerScheduleCounterEl = document.getElementById('trainerScheduleCounter');
  trainerScheduleSelectedDateEl = document.getElementById('trainerScheduleSelectedDate');
  trainerScheduleTimeSlotsEl = document.getElementById('trainerScheduleTimeSlots');
  trainerScheduleTimeSlotsCounterEl = document.getElementById('trainerScheduleTimeSlotsCounter');
  trainerScheduleRemoveBtn = document.getElementById('trainerScheduleRemoveBtn');
  const closeBtn = trainerScheduleModalEl.querySelector('.trainer-schedule-close');
  if (trainerScheduleSaveBtn) {
    trainerScheduleSaveBtn.addEventListener('click', handleTrainerScheduleSave);
  }
  if (trainerScheduleCancelBtn) {
    trainerScheduleCancelBtn.addEventListener('click', closeTrainerScheduleModal);
}
  if (closeBtn) closeBtn.addEventListener('click', closeTrainerScheduleModal);
  trainerScheduleModalEl.addEventListener('click', function(e) {
    if (e.target === trainerScheduleModalEl) closeTrainerScheduleModal();
  });
  if (trainerSchedulePrevBtn) trainerSchedulePrevBtn.addEventListener('click', () => shiftTrainerCalendarMonth(-1));
  if (trainerScheduleNextBtn) trainerScheduleNextBtn.addEventListener('click', () => shiftTrainerCalendarMonth(1));
  if (trainerScheduleRemoveBtn) trainerScheduleRemoveBtn.addEventListener('click', removeActiveTrainerScheduleDay);
  setupTrainerTimeSlots();
}

function setupTrainerTimeSlots() {
  if (!trainerScheduleTimeSlotsEl) return;
  trainerScheduleTimeSlotsEl.innerHTML = '';
  TRAINER_SCHEDULE_AVAILABLE_TIMES.forEach(time => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'trainer-time-slot-btn';
    btn.dataset.time = time;
    btn.textContent = time;
    btn.addEventListener('click', function() {
      handleTrainerTimeSlotClick(time, btn);
    });
    trainerScheduleTimeSlotsEl.appendChild(btn);
  });
}

function openTrainerScheduleModal() {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
  if (!isTrainerUser(user)) {
    showToast && showToast('Настройка доступна только для тренеров');
    return;
  }
  initTrainerScheduleModal();
  if (!trainerScheduleModalEl) return;
  const schedule = getTrainerScheduleForUser(user);
  prepareTrainerScheduleState(schedule && schedule.days ? schedule.days : []);
  setTrainerScheduleInfo(`Выберите минимум ${TRAINER_SCHEDULE_MIN_DAYS} рабочих дней. Для каждого дня выберите до ${TRAINER_SCHEDULE_MAX_SLOTS_PER_DAY} временных слотов.`, null);
  trainerScheduleModalEl.classList.remove('hidden');
  trainerScheduleModalEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeTrainerScheduleModal() {
  if (!trainerScheduleModalEl) return;
  trainerScheduleModalEl.classList.add('hidden');
  trainerScheduleModalEl.style.display = 'none';
  document.body.style.overflow = '';
}

function prepareTrainerScheduleState(existingDays) {
  trainerScheduleSelectableDates = generateUpcomingDates(TRAINER_SCHEDULE_WINDOW_DAYS);
  if (trainerScheduleSelectableDates.length) {
    const firstDate = trainerScheduleSelectableDates[0].date;
    const lastDate = trainerScheduleSelectableDates[trainerScheduleSelectableDates.length - 1].date;
    const [firstYear, firstMonth, firstDay] = firstDate.split('-').map(Number);
    const [lastYear, lastMonth, lastDay] = lastDate.split('-').map(Number);
    trainerScheduleMinDate = new Date(firstYear, firstMonth - 1, firstDay);
    trainerScheduleMaxDate = new Date(lastYear, lastMonth - 1, lastDay);
  } else {
    trainerScheduleMinDate = null;
    trainerScheduleMaxDate = null;
  }
  trainerScheduleSelectedMap = new Map();
  (existingDays || []).forEach(day => {
    if (!day || !day.date) return;
    const allowed = trainerScheduleSelectableDates.find(d => d.date === day.date);
    if (!allowed) return;
    // Конвертируем старый формат (start/end) в новый (slots)
    let slots = [];
    if (Array.isArray(day.slots)) {
      slots = day.slots;
    } else if (day.start && day.end) {
      // Конвертируем диапазон в слоты
      slots = convertTimeRangeToSlots(day.start, day.end);
    }
    trainerScheduleSelectedMap.set(day.date, {
      date: day.date,
      slots: slots
    });
  });
  trainerScheduleActiveDate = trainerScheduleSelectableDates.length ? trainerScheduleSelectableDates[0].date : null;
  trainerScheduleCurrentMonth = trainerScheduleSelectableDates.length
    ? new Date(`${trainerScheduleSelectableDates[0].date}T00:00:00`)
    : new Date();
  renderTrainerCalendar();
  updateTrainerScheduleSidebar(true);
}

function convertTimeRangeToSlots(start, end) {
  const slots = [];
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  for (let time of TRAINER_SCHEDULE_AVAILABLE_TIMES) {
    const [h, m] = time.split(':').map(Number);
    const timeMinutes = h * 60 + m;
    const slotEndMinutes = timeMinutes + TRAINER_SCHEDULE_SLOT_DURATION_HOURS * 60;
    if (timeMinutes >= startMinutes && slotEndMinutes <= endMinutes) {
      slots.push(time);
    }
  }
  return slots;
}

function shiftTrainerCalendarMonth(delta) {
  if (!trainerScheduleCurrentMonth) return;
  const next = new Date(trainerScheduleCurrentMonth);
  next.setMonth(next.getMonth() + delta);
  if (trainerScheduleMinDate && next < new Date(trainerScheduleMinDate.getFullYear(), trainerScheduleMinDate.getMonth(), 1)) return;
  if (trainerScheduleMaxDate) {
    const maxMonth = new Date(trainerScheduleMaxDate.getFullYear(), trainerScheduleMaxDate.getMonth(), 1);
    if (next > maxMonth) return;
  }
  trainerScheduleCurrentMonth = next;
  renderTrainerCalendar();
}

function renderTrainerCalendar() {
  if (!trainerScheduleCalendarDaysEl || !trainerScheduleCurrentMonth) return;
  const year = trainerScheduleCurrentMonth.getFullYear();
  const month = trainerScheduleCurrentMonth.getMonth();
  if (trainerScheduleMonthLabelEl) {
    trainerScheduleMonthLabelEl.textContent = trainerScheduleCurrentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - startOffset);
  trainerScheduleCalendarDaysEl.innerHTML = '';
  for (let i = 0; i < 42; i += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    // Формируем ISO строку в локальном времени
    const year = cellDate.getFullYear();
    const monthNum = cellDate.getMonth() + 1;
    const day = cellDate.getDate();
    const iso = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'calendar-day';
    btn.textContent = cellDate.getDate();
    const isCurrentMonth = cellDate.getMonth() === month && cellDate.getFullYear() === year;
    const withinWindow = trainerScheduleMinDate && trainerScheduleMaxDate
      ? (cellDate >= trainerScheduleMinDate && cellDate <= trainerScheduleMaxDate)
      : true;
    const selectable = isCurrentMonth && withinWindow;
    if (!selectable) btn.classList.add('disabled');
    if (iso === getTodayDateStr()) btn.classList.add('today');
    if (trainerScheduleSelectedMap.has(iso)) btn.classList.add('selected');
    if (trainerScheduleActiveDate === iso) btn.classList.add('active');
    if (selectable) {
      btn.addEventListener('click', function() { handleTrainerCalendarDayClick(iso); });
    }
    trainerScheduleCalendarDaysEl.appendChild(btn);
  }
  updateTrainerCalendarNavButtons();
}

function updateTrainerCalendarNavButtons() {
  if (!trainerSchedulePrevBtn || !trainerScheduleNextBtn || !trainerScheduleCurrentMonth) return;
  const monthStart = new Date(trainerScheduleCurrentMonth.getFullYear(), trainerScheduleCurrentMonth.getMonth(), 1);
  const minMonth = trainerScheduleMinDate ? new Date(trainerScheduleMinDate.getFullYear(), trainerScheduleMinDate.getMonth(), 1) : null;
  const maxMonth = trainerScheduleMaxDate ? new Date(trainerScheduleMaxDate.getFullYear(), trainerScheduleMaxDate.getMonth(), 1) : null;
  trainerSchedulePrevBtn.disabled = !!(minMonth && monthStart.getTime() <= minMonth.getTime());
  trainerScheduleNextBtn.disabled = !!(maxMonth && monthStart.getTime() >= maxMonth.getTime());
}

function handleTrainerCalendarDayClick(dateStr) {
  if (!dateStr) return;
  // При повторном клике на уже выбранную дату просто делаем её активной, не удаляем
  trainerScheduleActiveDate = dateStr;
  if (!trainerScheduleSelectedMap.has(dateStr)) {
    trainerScheduleSelectedMap.set(dateStr, { date: dateStr, slots: [] });
  }
  updateTrainerScheduleSidebar(false);
  renderTrainerCalendar();
}

function updateTrainerScheduleSidebar(forceFocus) {
  if (!trainerScheduleCounterEl || !trainerScheduleSelectedDateEl || !trainerScheduleTimeSlotsEl || !trainerScheduleTimeSlotsCounterEl) return;
  const total = trainerScheduleSelectedMap.size;
  trainerScheduleCounterEl.textContent = total
    ? `Выбрано ${total} дн. (нужно ≥ ${TRAINER_SCHEDULE_MIN_DAYS})`
    : 'Дней не выбрано';
  if (!trainerScheduleActiveDate && total) {
    trainerScheduleActiveDate = [...trainerScheduleSelectedMap.keys()].sort()[0];
  }
  if (!trainerScheduleActiveDate) {
    trainerScheduleSelectedDateEl.textContent = 'Выберите дату в календаре';
    if (trainerScheduleTimeSlotsEl) {
      trainerScheduleTimeSlotsEl.querySelectorAll('.trainer-time-slot-btn').forEach(btn => {
        btn.disabled = true;
        btn.classList.remove('selected');
      });
    }
    if (trainerScheduleTimeSlotsCounterEl) trainerScheduleTimeSlotsCounterEl.textContent = 'Выбрано: 0 из 6';
    if (trainerScheduleRemoveBtn) trainerScheduleRemoveBtn.disabled = true;
    return;
  }
  const data = trainerScheduleSelectedMap.get(trainerScheduleActiveDate) || {
    date: trainerScheduleActiveDate,
    slots: []
  };
  trainerScheduleSelectedDateEl.textContent = formatDateHuman(trainerScheduleActiveDate);
  const selectedSlots = Array.isArray(data.slots) ? data.slots : [];
  if (trainerScheduleTimeSlotsEl) {
    trainerScheduleTimeSlotsEl.querySelectorAll('.trainer-time-slot-btn').forEach(btn => {
      btn.disabled = false;
      const time = btn.dataset.time;
      const isSelected = selectedSlots.includes(time);
      btn.classList.toggle('selected', isSelected);
      // Проверяем, можно ли выбрать этот слот
      const canSelect = canSelectTimeSlot(time, selectedSlots);
      if (!isSelected && !canSelect) {
        btn.classList.add('disabled');
      } else {
        btn.classList.remove('disabled');
      }
    });
  }
  if (trainerScheduleTimeSlotsCounterEl) {
    trainerScheduleTimeSlotsCounterEl.textContent = `Выбрано: ${selectedSlots.length} из ${TRAINER_SCHEDULE_MAX_SLOTS_PER_DAY}`;
  }
  if (trainerScheduleRemoveBtn) trainerScheduleRemoveBtn.disabled = false;
}

function canSelectTimeSlot(time, selectedSlots) {
  if (selectedSlots.length >= TRAINER_SCHEDULE_MAX_SLOTS_PER_DAY) return false;
  if (selectedSlots.length === 0) return true;
  
  // Проверяем, не пересекается ли новый слот с уже выбранными
  const [h, m] = time.split(':').map(Number);
  const slotStartMinutes = h * 60 + m;
  const slotEndMinutes = slotStartMinutes + TRAINER_SCHEDULE_SLOT_DURATION_HOURS * 60;
  
  for (const selectedTime of selectedSlots) {
    const [sh, sm] = selectedTime.split(':').map(Number);
    const selectedStartMinutes = sh * 60 + sm;
    const selectedEndMinutes = selectedStartMinutes + TRAINER_SCHEDULE_SLOT_DURATION_HOURS * 60;
    
    // Проверяем пересечение
    if (!(slotEndMinutes <= selectedStartMinutes || slotStartMinutes >= selectedEndMinutes)) {
      return false;
    }
  }
  return true;
}

function handleTrainerTimeSlotClick(time, btn) {
  if (!trainerScheduleActiveDate) return;
  const data = trainerScheduleSelectedMap.get(trainerScheduleActiveDate) || {
    date: trainerScheduleActiveDate,
    slots: []
  };
  const selectedSlots = Array.isArray(data.slots) ? data.slots : [];
  const index = selectedSlots.indexOf(time);
  
  if (index !== -1) {
    // Убираем слот
    selectedSlots.splice(index, 1);
  } else {
    // Добавляем слот, если можно
    if (selectedSlots.length >= TRAINER_SCHEDULE_MAX_SLOTS_PER_DAY) {
      showToast && showToast(`Можно выбрать максимум ${TRAINER_SCHEDULE_MAX_SLOTS_PER_DAY} слотов в день`);
      return;
    }
    if (!canSelectTimeSlot(time, selectedSlots)) {
      showToast && showToast('Этот слот пересекается с уже выбранными. Каждый слот занимает 2 часа.');
      return;
    }
    selectedSlots.push(time);
    selectedSlots.sort(); // Сортируем по времени
  }
  
  trainerScheduleSelectedMap.set(trainerScheduleActiveDate, {
    date: trainerScheduleActiveDate,
    slots: selectedSlots
  });
  updateTrainerScheduleSidebar(false);
}


function removeActiveTrainerScheduleDay() {
  if (!trainerScheduleActiveDate) return;
  trainerScheduleSelectedMap.delete(trainerScheduleActiveDate);
  trainerScheduleActiveDate = trainerScheduleSelectedMap.size ? [...trainerScheduleSelectedMap.keys()].sort()[0] : null;
  updateTrainerScheduleSidebar(false);
  renderTrainerCalendar();
}

function handleTrainerScheduleSave() {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
  if (!isTrainerUser(user)) { showToast && showToast('Настройка доступна только для тренеров'); return; }
  const selectedDays = collectTrainerScheduleFromState();
  if (selectedDays.length < TRAINER_SCHEDULE_MIN_DAYS) {
    setTrainerScheduleInfo(`Выбрано только ${selectedDays.length} дней. Нужно минимум ${TRAINER_SCHEDULE_MIN_DAYS}.`, 'error');
    return;
  }
  // Проверяем, что в каждом дне есть хотя бы один слот
  const emptyDays = selectedDays.filter(day => !Array.isArray(day.slots) || day.slots.length === 0);
  if (emptyDays.length > 0) {
    setTrainerScheduleInfo(`В день ${formatDateHuman(emptyDays[0].date)} не выбрано ни одного временного слота.`, 'error');
    return;
  }
  const schedule = saveTrainerScheduleForUser(user, selectedDays);
  setTrainerScheduleInfo(`Сохранено ${schedule.days.length} рабочих дней`, 'success');
  closeTrainerScheduleModal();
  renderTrainerAvailabilitySummary();
  try { showToast('Расписание сохранено'); } catch {}
  if (bookTrainerSel) {
    updateTrainerAvailabilityForClient(true);
  }
}

function collectTrainerScheduleFromState() {
  return Array.from(trainerScheduleSelectedMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function setTrainerScheduleInfo(message, state) {
  if (!trainerScheduleInfoEl) return;
  trainerScheduleInfoEl.textContent = message || '';
  trainerScheduleInfoEl.classList.remove('error', 'success');
  if (state) trainerScheduleInfoEl.classList.add(state);
}

function sanitizeTrainerScheduleDays(days) {
  if (!Array.isArray(days)) return [];
  const today = getTodayDateStr();
  const map = new Map();
  days.forEach(day => {
    if (!day || !day.date) return;
    if (day.date < today) return;
    const slots = Array.isArray(day.slots) ? day.slots.filter(s => TRAINER_SCHEDULE_AVAILABLE_TIMES.includes(s)) : [];
    if (slots.length === 0) return;
    // Вычисляем start и end из слотов для обратной совместимости
    const sortedSlots = slots.slice().sort();
    const start = sortedSlots[0];
    const lastSlot = sortedSlots[sortedSlots.length - 1];
    const [lastHour, lastMin] = lastSlot.split(':').map(Number);
    const endMinutes = lastHour * 60 + lastMin + TRAINER_SCHEDULE_SLOT_DURATION_HOURS * 60;
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const end = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    map.set(day.date, {
      date: day.date,
      slots: sortedSlots,
      start: start,
      end: end
    });
  });
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function saveTrainerScheduleForUser(user, days) {
  const cleaned = sanitizeTrainerScheduleDays(days);
  const schedule = {
    trainerId: user.id,
    trainerName: user.name || '',
    trainerNameLower: String(user.name || '').trim().toLowerCase(),
    trainerEmail: String(user.email || '').trim().toLowerCase(),
    days: cleaned,
    updatedAt: new Date().toISOString()
  };
  user.trainerSchedule = schedule;
  setCurrentUser(user);
  const users = readUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    users[idx].trainerSchedule = schedule;
    writeUsers(users);
  }
  cacheTrainerSchedule(schedule);
  return schedule;
}

function getTrainerScheduleForUser(user) {
  if (!user) return null;
  if (user.trainerSchedule && Array.isArray(user.trainerSchedule.days)) {
    cacheTrainerSchedule(user.trainerSchedule);
    return user.trainerSchedule;
  }
  const map = readTrainerSchedulesMap();
  const emailKey = normalizeScheduleKey(user.email);
  if (emailKey && map[emailKey]) return map[emailKey];
  if (user.id && map[`id_${user.id}`]) return map[`id_${user.id}`];
  const nameKey = normalizeScheduleKey(user.name);
  if (nameKey && map[`name_${nameKey}`]) return map[`name_${nameKey}`];
  return null;
}

function readTrainerSchedulesMap() {
  try {
    return JSON.parse(localStorage.getItem(TRAINER_SCHEDULE_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeTrainerSchedulesMap(map) {
  try {
    localStorage.setItem(TRAINER_SCHEDULE_STORAGE_KEY, JSON.stringify(map || {}));
  } catch {}
}

function normalizeScheduleKey(value) {
  const key = String(value || '').trim().toLowerCase();
  return key || '';
}

function cacheTrainerSchedule(schedule) {
  if (!schedule) return;
  if (!schedule.trainerNameLower && schedule.trainerName) {
    schedule.trainerNameLower = String(schedule.trainerName || '').trim().toLowerCase();
  }
  const map = readTrainerSchedulesMap();
  const emailKey = normalizeScheduleKey(schedule.trainerEmail);
  if (emailKey) map[emailKey] = schedule;
  if (schedule.trainerId) map[`id_${schedule.trainerId}`] = schedule;
  if (schedule.trainerNameLower) map[`name_${schedule.trainerNameLower}`] = schedule;
  writeTrainerSchedulesMap(map);
}

function findTrainerScheduleByLookup({ name, email }) {
  const map = readTrainerSchedulesMap();
  const emailKey = normalizeScheduleKey(email);
  if (emailKey && map[emailKey]) return map[emailKey];
  const nameKey = normalizeScheduleKey(name);
  if (nameKey && map[`name_${nameKey}`]) return map[`name_${nameKey}`];
  if (nameKey) {
    const fallback = Object.values(map).find(entry => entry && entry.trainerNameLower === nameKey);
    if (fallback) return fallback;
  }
  return null;
}

function generateUpcomingDates(count) {
  const out = [];
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();
  
  for (let i = 0; i < count; i += 1) {
    const date = new Date(todayYear, todayMonth, todayDay + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const iso = `${year}-${month}-${day}`;
    const label = date.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: 'long' });
    out.push({ date: iso, label });
  }
  return out;
}

function filterFutureScheduleDays(days) {
  const today = getTodayDateStr();
  return (Array.isArray(days) ? days : [])
    .filter(day => day && day.date && day.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function formatDateHuman(dateStr) {
  if (!dateStr) return '';
  // Парсим дату в формате YYYY-MM-DD, создавая дату в локальном времени
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: 'long' });
}

function diffMinutesBetweenTimes(start, end) {
  const [sh, sm] = String(start || '00:00').split(':').map(Number);
  const [eh, em] = String(end || '00:00').split(':').map(Number);
  if ([sh, sm, eh, em].some(v => Number.isNaN(v))) return 0;
  return (eh * 60 + em) - (sh * 60 + sm);
}

// Делаем доступной глобально
try { window.renderTrainerSchedule = renderTrainerSchedule; } catch {}
try { window.renderTrainerNotifications = renderTrainerNotifications; } catch {}

function renderTrainerNotifications() {
  const user = getCurrentUser();
  const block = document.getElementById('trainerNotificationsBlock');
  const listEl = document.getElementById('trainerNotificationsList');
  const clearBtn = document.getElementById('trainerNotificationsClearBtn');
  const trainerBtn = document.getElementById('trainerClientsBtn');
  if (!block || !listEl) return;
  if (!isTrainerUser(user)) {
    block.style.display = 'none';
    if (trainerBtn) trainerBtn.textContent = trainerBtn.dataset.baseText || 'Записи ко мне';
    return;
  }
  const notifications = Array.isArray(user && user.trainerNotifications) ? user.trainerNotifications : [];
  listEl.innerHTML = '';
  block.style.display = '';
  if (!notifications.length) {
    const empty = document.createElement('div');
    empty.className = 'bookings-empty';
    empty.textContent = 'Уведомлений пока нет';
    listEl.appendChild(empty);
  } else {
    notifications.forEach(note => {
      const item = document.createElement('div');
      item.className = 'trainer-notification';
      if (note.status !== 'read') item.classList.add('new');
      const title = document.createElement('div');
      title.className = 'trainer-notification-title';
      title.textContent = `${note.clientName || 'Пользователь'} записался к вам`;
      const meta = document.createElement('div');
      meta.className = 'trainer-notification-meta';
      meta.textContent = `${note.date || ''} ${note.time || ''} • ${formatGym(note.gym)}`;
      const contact = document.createElement('div');
      contact.className = 'trainer-notification-meta';
      contact.textContent = note.clientEmail || '';
      item.appendChild(title);
      item.appendChild(meta);
      if (note.clientEmail) item.appendChild(contact);
      if (note.notes) {
        const notes = document.createElement('div');
        notes.className = 'trainer-notification-notes';
        notes.textContent = `Пожелания: ${note.notes}`;
        item.appendChild(notes);
      }
      listEl.appendChild(item);
    });
  }
  if (clearBtn) clearBtn.style.display = notifications.length ? '' : 'none';
  if (notifications.length) {
    const updated = notifications.map(n => ({ ...n, status: 'read' }));
    user.trainerNotifications = updated;
    user.hasNewTrainerNotifications = false;
    setCurrentUser(user);
    const users = readUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].trainerNotifications = updated;
      users[idx].hasNewTrainerNotifications = false;
      writeUsers(users);
    }
  }
  if (trainerBtn) {
    const base = trainerBtn.dataset.baseText || 'Записи ко мне';
    const count = notifications.length;
    trainerBtn.textContent = count ? `${base} (${count})` : base;
  }
}

function clearTrainerNotifications() {
  const user = getCurrentUser();
  if (!user) return;
  user.trainerNotifications = [];
  user.hasNewTrainerNotifications = false;
  setCurrentUser(user);
  const users = readUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    users[idx].trainerNotifications = [];
    users[idx].hasNewTrainerNotifications = false;
    writeUsers(users);
  }
  renderTrainerNotifications();
  try { showToast('Уведомления очищены'); } catch {}
}

// ===== Запись на тренировку =====
let bookModalEl, bookFormEl, bookGymEl, bookWarningEl, bookNotesEl, bookCloseBtn;
let bookStep1El, bookStep2El, bookTrainersGridEl, bookSelectedTrainerInfoEl;
let bookCalendarDaysEl, bookMonthLabelEl, bookPrevMonthBtn, bookNextMonthBtn;
let bookSelectedDateEl, bookTimeSlotsEl, bookBackBtn, bookSubmitBtn;
let bookCurrentStep = 1;
let bookSelectedTrainer = null;
let bookSelectedDate = null;
let bookSelectedTime = null;
let bookCurrentMonth = null;
let bookAvailableDays = [];
let bookingsModalEl, bookingsListEl, bookingsCloseBtn;
let trainerClientsModalEl, trainerClientsListEl, trainerClientsCloseBtn;
let trainerScheduleModalEl, trainerScheduleInfoEl, trainerScheduleSaveBtn, trainerScheduleCancelBtn;
let trainerScheduleMonthLabelEl, trainerSchedulePrevBtn, trainerScheduleNextBtn, trainerScheduleCalendarDaysEl;
let trainerScheduleCounterEl, trainerScheduleSelectedDateEl, trainerScheduleTimeSlotsEl, trainerScheduleTimeSlotsCounterEl, trainerScheduleRemoveBtn;
let trainerScheduleSelectableDates = [];
let trainerScheduleSelectedMap = new Map(); // хранит { date: { date, slots: ['11:00', '13:00', ...] } }
let trainerScheduleActiveDate = null;
let trainerScheduleMinDate = null;
let trainerScheduleMaxDate = null;
let trainerScheduleCurrentMonth = null;
let currentTrainerAvailabilityDays = [];

function setupBookModalRefs() {
  if (bookModalEl) return; // уже инициализировано
  bookModalEl = document.getElementById('bookModal');
  if (!bookModalEl) return;
  bookFormEl = document.getElementById('bookForm');
  bookGymEl = document.getElementById('bookGym');
  bookWarningEl = document.getElementById('bookWarning');
  bookNotesEl = document.getElementById('bookNotes');
  bookCloseBtn = bookModalEl.querySelector('.book-close');
  bookStep1El = document.getElementById('bookStep1');
  bookStep2El = document.getElementById('bookStep2');
  bookTrainersGridEl = document.getElementById('bookTrainersGrid');
  bookSelectedTrainerInfoEl = document.getElementById('bookSelectedTrainerInfo');
  bookCalendarDaysEl = document.getElementById('bookCalendarDays');
  bookMonthLabelEl = document.getElementById('bookMonthLabel');
  bookPrevMonthBtn = document.getElementById('bookPrevMonth');
  bookNextMonthBtn = document.getElementById('bookNextMonth');
  bookSelectedDateEl = document.getElementById('bookSelectedDate');
  bookTimeSlotsEl = document.getElementById('bookTimeSlots');
  bookBackBtn = document.getElementById('bookBackBtn');
  bookSubmitBtn = document.getElementById('bookSubmitBtn');

  if (bookCloseBtn) bookCloseBtn.addEventListener('click', closeBookModal);
  // Закрытие по клику на фон
  let isBookModalDragging = false;
  let bookModalStartTarget = null;
  
  bookModalEl.addEventListener('mousedown', function(e) {
    bookModalStartTarget = e.target;
    isBookModalDragging = false;
  });
  
  bookModalEl.addEventListener('mousemove', function(e) {
    if (bookModalStartTarget && e.target !== bookModalStartTarget) {
      isBookModalDragging = true;
    }
  });
  
  bookModalEl.addEventListener('click', function(e) {
    if (e.target === bookModalEl && !isBookModalDragging) {
      closeBookModal();
    }
    isBookModalDragging = false;
    bookModalStartTarget = null;
  });

  if (bookFormEl) {
    bookFormEl.addEventListener('submit', function(e) {
      e.preventDefault();
      submitBooking();
    });
  }
  if (bookGymEl) {
    bookGymEl.addEventListener('change', function() {
      fillTrainersGrid();
    });
  }
  if (bookBackBtn) {
    bookBackBtn.addEventListener('click', function() {
      goToBookStep(1);
    });
  }
  if (bookPrevMonthBtn) {
    bookPrevMonthBtn.addEventListener('click', () => shiftBookCalendarMonth(-1));
  }
  if (bookNextMonthBtn) {
    bookNextMonthBtn.addEventListener('click', () => shiftBookCalendarMonth(1));
  }
}

function openBookModal() {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
  if (!(window.isEmailVerified ? window.isEmailVerified(user) : (user && user.emailVerified))) {
    showToast('Подтвердите e‑mail через ссылку в письме, чтобы записываться на тренировки');
    return;
  }
  setupBookModalRefs();
  if (!bookModalEl) return;
  
  // Сброс состояния
  bookCurrentStep = 1;
  bookSelectedTrainer = null;
  bookSelectedDate = null;
  bookSelectedTime = null;
  bookAvailableDays = [];
  
  // Предупреждение об отсутствии абонемента
  const hasPlans = Array.isArray(user.plans) && user.plans.length > 0;
  if (!hasPlans) {
    if (bookWarningEl) {
      bookWarningEl.style.display = '';
      bookWarningEl.textContent = 'У вас нет активного абонемента. Для занятий необходимо приобрести абонемент. Вы всё равно можете записаться.';
    }
  } else {
    if (bookWarningEl) {
      bookWarningEl.style.display = 'none';
      bookWarningEl.textContent = '';
    }
  }
  
  // Сброс формы
  if (bookFormEl) bookFormEl.reset();
  if (bookNotesEl) bookNotesEl.value = '';
  
  // Заполнить список тренеров
  fillTrainersGrid();
  
  // Показать первый шаг
  goToBookStep(1);
  
  bookModalEl.classList.remove('hidden');
  bookModalEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeBookModal() {
  if (!bookModalEl) return;
  bookModalEl.classList.add('hidden');
  bookModalEl.style.display = 'none';
  document.body.style.overflow = '';
}

// ===== Supabase: обновление полей пользователя =====
async function saveUserFieldsToSupabase(user, fields) {
  if (!window.supabase) return;
  try {
    if (!user.supabaseId && typeof window.syncUserWithSupabase === 'function') {
      await window.syncUserWithSupabase(user);
      user = getCurrentUser();
    }
    const userId = user && user.supabaseId;
    if (!userId) return;
    const { error } = await supabase.from('users').update(fields).eq('id', userId);
    if (error) throw error;
    console.log('[supabase] user fields updated', fields);
  } catch (e) { console.warn('[supabase] update user failed', e); }
}

// ===== Мои записи =====
function setupBookingsRefs() {
  if (bookingsModalEl) return;
  bookingsModalEl = document.getElementById('bookingsModal');
  if (!bookingsModalEl) return;
  bookingsListEl = document.getElementById('bookingsList');
  bookingsCloseBtn = bookingsModalEl.querySelector('.bookings-close');
  if (bookingsCloseBtn) bookingsCloseBtn.addEventListener('click', closeBookingsModal);
  // Закрытие по клику на фон с защитой от случайного закрытия при перетаскивании
  let isBookingsModalDragging = false;
  let bookingsModalStartTarget = null;
  
  bookingsModalEl.addEventListener('mousedown', function(e) {
    bookingsModalStartTarget = e.target;
    isBookingsModalDragging = false;
  });
  
  bookingsModalEl.addEventListener('mousemove', function(e) {
    if (bookingsModalStartTarget && e.target !== bookingsModalStartTarget) {
      isBookingsModalDragging = true;
    }
  });
  
  bookingsModalEl.addEventListener('click', function(e) {
    if (e.target === bookingsModalEl && !isBookingsModalDragging) {
      closeBookingsModal();
    }
    isBookingsModalDragging = false;
    bookingsModalStartTarget = null;
  });
}

function openBookingsModal() {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
  setupBookingsRefs();
  if (!bookingsModalEl) return;
  renderBookingsList();
  bookingsModalEl.classList.remove('hidden');
  bookingsModalEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeBookingsModal() {
  if (!bookingsModalEl) return;
  bookingsModalEl.classList.add('hidden');
  bookingsModalEl.style.display = 'none';
  document.body.style.overflow = '';
}

function renderBookingsList() {
  if (!bookingsListEl) return;
  bookingsListEl.innerHTML = '';
  const user = getCurrentUser();
  const list = (user && Array.isArray(user.bookings)) ? user.bookings.slice().sort((a,b)=> new Date(a.date) - new Date(b.date)) : [];
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'bookings-empty';
    empty.textContent = 'Записей пока нет';
    bookingsListEl.appendChild(empty);
    return;
  }
  list.forEach((b) => {
    const item = document.createElement('div');
    item.className = 'booking-item';
    const title = document.createElement('h4');
    title.textContent = `${b.trainer || 'Тренировка'}${b.gym ? ' · ' + formatGym(b.gym) : ''}`;
    const meta = document.createElement('div');
    meta.className = 'booking-meta';
    meta.textContent = `${b.date || ''} ${b.time || ''}`;
    const notes = document.createElement('div');
    notes.className = 'booking-notes';
    notes.textContent = b.notes || '';
    const actions = document.createElement('div');
    actions.className = 'booking-actions';
    const confirmWrap = document.createElement('label');
    confirmWrap.className = 'booking-confirm-wrap';
    const confirmCb = document.createElement('input');
    confirmCb.type = 'checkbox';
    confirmCb.className = 'booking-confirm-cb';
    const confirmText = document.createElement('span');
    confirmText.textContent = ' Подтверждаю удаление';
    confirmWrap.appendChild(confirmCb);
    confirmWrap.appendChild(confirmText);
    const delBtn = document.createElement('button');
    delBtn.className = 'booking-cancel-btn';
    delBtn.textContent = 'Отменить';
    delBtn.setAttribute('disabled', 'true');
    confirmCb.addEventListener('change', function() {
      if (this.checked) delBtn.removeAttribute('disabled'); else delBtn.setAttribute('disabled', 'true');
    });
    delBtn.addEventListener('click', function() { if (!confirmCb.checked) return; cancelBooking(b.id); });
    actions.appendChild(confirmWrap);
    actions.appendChild(delBtn);
    item.appendChild(title);
    item.appendChild(actions);
    item.appendChild(meta);
    if (b.notes) item.appendChild(notes);
    bookingsListEl.appendChild(item);
  });
}

function formatGym(code) {
  switch (code) {
    case 'nemiga': return 'Немига Бизнес-центр';
    case 'prityckogo': return 'Притыцкого';
    default: return 'Зал';
  }
}

function cancelBooking(id) {
  const user = getCurrentUser();
  if (!user) return;
  const list = Array.isArray(user.bookings) ? user.bookings : [];
  const idx = list.findIndex(x => x.id === id);
  if (idx === -1) return;
  list.splice(idx, 1);
  user.bookings = list;
  setCurrentUser(user);
  const users = readUsers();
  const uidx = users.findIndex(u => u.id === user.id);
  if (uidx !== -1) { users[uidx].bookings = list; writeUsers(users); }
  renderBookingsList();
  showToast('Запись отменена');
}

function notifyTrainerAboutBooking({ trainerName, trainerEmail, booking, client }) {
  const email = String(trainerEmail || '').trim().toLowerCase();
  if (!email) return;
  const users = readUsers();
  let updated = false;
  users.forEach((u, idx) => {
    if (String(u.email || '').toLowerCase() === email) {
      const notifications = Array.isArray(u.trainerNotifications) ? u.trainerNotifications.slice() : [];
      notifications.unshift({
        id: `${booking.id}_${Date.now()}`,
        bookingId: booking.id,
        trainerName,
        clientName: client.name || client.email,
        clientEmail: client.email || '',
        gym: booking.gym,
        date: booking.date,
        time: booking.time,
        notes: booking.notes || '',
        createdAt: new Date().toISOString(),
        status: 'new'
      });
      if (notifications.length > 50) notifications.length = 50;
      u.trainerNotifications = notifications;
      u.hasNewTrainerNotifications = true;
      users[idx] = u;
      updated = true;
    }
  });
  if (updated) {
    writeUsers(users);
    const current = getCurrentUser();
    if (current && String(current.email || '').toLowerCase() === email) {
      const refreshed = users.find(u => u.id === current.id);
      current.trainerNotifications = refreshed.trainerNotifications;
      current.hasNewTrainerNotifications = true;
      setCurrentUser(current);
      try { renderTrainerNotifications(); renderTrainerSchedule(); } catch {}
      try { showToast('Новая запись к вам на тренировку'); } catch {}
    }
  }
}

function setupTrainerClientsModal() {
  if (trainerClientsModalEl) return;
  trainerClientsModalEl = document.getElementById('trainerClientsModal');
  if (!trainerClientsModalEl) return;
  trainerClientsListEl = document.getElementById('trainerClientsList');
  trainerClientsCloseBtn = trainerClientsModalEl.querySelector('.trainer-clients-close');
  if (trainerClientsCloseBtn) trainerClientsCloseBtn.addEventListener('click', closeTrainerClientsModal);
  trainerClientsModalEl.addEventListener('click', function(e) {
    if (e.target === trainerClientsModalEl) closeTrainerClientsModal();
  });
}

function openTrainerClientsModal() {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
  if (!isTrainerUser(user)) { showToast('Доступ только для тренеров'); return; }
  setupTrainerClientsModal();
  if (!trainerClientsModalEl) return;
  renderTrainerClientsList();
  trainerClientsModalEl.classList.remove('hidden');
  trainerClientsModalEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeTrainerClientsModal() {
  if (!trainerClientsModalEl) return;
  trainerClientsModalEl.classList.add('hidden');
  trainerClientsModalEl.style.display = 'none';
  document.body.style.overflow = '';
}

function renderTrainerClientsList() {
  setupTrainerClientsModal();
  if (!trainerClientsListEl) return;
  trainerClientsListEl.innerHTML = '';
  const me = getCurrentUser();
  const list = collectTrainerBookings(me);
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'bookings-empty';
    empty.textContent = 'Пока никто не записался';
    trainerClientsListEl.appendChild(empty);
    return;
  }
  const statusMap = { planned: 'запланировано', scheduled: 'запланировано', attended: 'посетил', completed: 'посетил', done: 'посетил', missed: 'не пришёл', cancelled: 'отменена' };
  list.forEach(({ user, booking }) => {
    const item = document.createElement('div');
    item.className = 'trainer-client-item';
    const avatar = createAvatarElement(user, 'trainer-client-avatar');
    const info = document.createElement('div');
    info.className = 'trainer-client-info';

    const title = document.createElement('div');
    title.className = 'trainer-client-title';
    title.textContent = user.name || user.email || 'Пользователь';

    const contact = document.createElement('div');
    contact.className = 'trainer-client-contact';
    const parts = [];
    if (user.email) parts.push(user.email);
    if (user.phone) parts.push(user.phone);
    contact.textContent = parts.length ? parts.join(' • ') : 'Контакты не указаны';

    const meta = document.createElement('div');
    meta.className = 'trainer-client-meta';
    const dateStr = `${booking.date || '-'} ${booking.time || ''}`.trim();
    const status = statusMap[booking.status] || booking.status || 'неизвестно';
    const bits = [];
    if (dateStr) bits.push(dateStr);
    if (booking.gym) bits.push(formatGym(booking.gym));
    bits.push(`Статус: ${status}`);
    meta.textContent = bits.join(' • ');

    const notes = document.createElement('div');
    notes.className = 'trainer-client-notes';
    notes.textContent = booking.notes ? `Пожелания: ${booking.notes}` : 'Пожеланий нет';

    info.appendChild(title);
    info.appendChild(contact);
    info.appendChild(meta);
    info.appendChild(notes);

    item.appendChild(avatar);
    item.appendChild(info);
    trainerClientsListEl.appendChild(item);
  });
}

function fillTrainersGrid() {
  if (!bookTrainersGridEl) return;
  const selectedGym = (bookGymEl && bookGymEl.value) || 'nemiga';

  // Карта закрепления тренеров за залами
  const trainerToGym = {
    'Винокуров Илья': 'nemiga',
    'Анастасия Павловна': 'prityckogo',
    'Шаповалов сигмович': 'nemiga',
    'Петушков Александр': 'prityckogo',
    'Виталий Цаль': 'nemiga'
  };

  const cards = document.querySelectorAll('#trainers-section .trainer-card');
  const items = [];
  cards.forEach((card) => {
    const nameEl = card.querySelector('h3');
    const imgEl = card.querySelector('img');
    const descEl = card.querySelector('p');
    if (nameEl) {
      const name = nameEl.textContent.trim();
      const gymAttr = card.dataset.gym || '';
      const emailAttr = (card.dataset.email || '').trim();
      const gym = gymAttr || trainerToGym[name] || 'nemiga';
      if (gym === selectedGym) {
        items.push({ 
          name, 
          photo: imgEl ? imgEl.src : '', 
          email: emailAttr,
          description: descEl ? descEl.textContent.trim() : ''
        });
      }
    }
  });
  
  // fallback на случай пустоты
  if (!items.length) {
    items.push({ name: 'Персональный тренер', photo: '', email: '', description: '' });
  }
  
  bookTrainersGridEl.innerHTML = '';
  items.forEach((t) => {
    const card = document.createElement('div');
    card.className = 'book-trainer-card';
    card.dataset.name = t.name;
    card.dataset.email = t.email;
    
    if (t.photo) {
      const img = document.createElement('img');
      img.src = t.photo;
      img.alt = t.name;
      img.className = 'book-trainer-card-photo';
      card.appendChild(img);
    }
    
    const nameEl = document.createElement('h3');
    nameEl.className = 'book-trainer-card-name';
    nameEl.textContent = t.name;
    card.appendChild(nameEl);
    
    if (t.description) {
      const descEl = document.createElement('p');
      descEl.className = 'book-trainer-card-desc';
      descEl.textContent = t.description;
      card.appendChild(descEl);
    }
    
    card.addEventListener('click', function() {
      selectBookTrainer(t);
    });
    
    bookTrainersGridEl.appendChild(card);
  });
}

function selectBookTrainer(trainer) {
  bookSelectedTrainer = trainer;
  
  // Обновить визуальное выделение
  if (bookTrainersGridEl) {
    bookTrainersGridEl.querySelectorAll('.book-trainer-card').forEach(card => {
      card.classList.remove('selected');
      if (card.dataset.name === trainer.name) {
        card.classList.add('selected');
      }
    });
  }
  
  // Показать информацию о выбранном тренере
  if (bookSelectedTrainerInfoEl) {
    bookSelectedTrainerInfoEl.innerHTML = '';
    if (trainer.photo) {
      const img = document.createElement('img');
      img.src = trainer.photo;
      img.alt = trainer.name;
      img.className = 'book-selected-trainer-photo';
      bookSelectedTrainerInfoEl.appendChild(img);
    }
    const info = document.createElement('div');
    info.className = 'book-selected-trainer-info';
    const name = document.createElement('h3');
    name.className = 'book-selected-trainer-name';
    name.textContent = trainer.name;
    const desc = document.createElement('p');
    desc.className = 'book-selected-trainer-desc';
    desc.textContent = trainer.description || '';
    info.appendChild(name);
    info.appendChild(desc);
    bookSelectedTrainerInfoEl.appendChild(info);
  }
  
  // Загрузить расписание тренера
  loadTrainerScheduleForBooking(trainer);
  
  // Перейти ко второму шагу
  setTimeout(() => {
    goToBookStep(2);
  }, 300);
}

function loadTrainerScheduleForBooking(trainer) {
  const schedule = findTrainerScheduleByLookup({ name: trainer.name, email: trainer.email });
  const today = getTodayDateStr();
  if (schedule && Array.isArray(schedule.days)) {
    bookAvailableDays = schedule.days
      .filter(day => day && day.date && day.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  } else {
    bookAvailableDays = [];
  }
  
  // Если нет доступных дней, показать сообщение
  if (bookAvailableDays.length === 0 && bookSelectedDateEl) {
    bookSelectedDateEl.textContent = 'Тренер пока не указал доступные даты';
  }
  
  // Инициализировать календарь
  initBookCalendar();
}

function initBookCalendar() {
  if (!bookCurrentMonth) {
    bookCurrentMonth = new Date();
  }
  renderBookCalendar();
}

function renderBookCalendar() {
  if (!bookCalendarDaysEl || !bookMonthLabelEl || !bookCurrentMonth) return;
  
  const year = bookCurrentMonth.getFullYear();
  const month = bookCurrentMonth.getMonth();
  
  if (bookMonthLabelEl) {
    bookMonthLabelEl.textContent = bookCurrentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }
  
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - startOffset);
  
  bookCalendarDaysEl.innerHTML = '';
  const today = getTodayDateStr();
  
  for (let i = 0; i < 42; i += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const yearNum = cellDate.getFullYear();
    const monthNum = cellDate.getMonth() + 1;
    const day = cellDate.getDate();
    const iso = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'book-calendar-day';
    btn.textContent = cellDate.getDate();
    
    const isCurrentMonth = cellDate.getMonth() === month && cellDate.getFullYear() === year;
    const isPast = iso < today;
    const isAvailable = bookAvailableDays.length === 0 || bookAvailableDays.some(day => day.date === iso);
    
    if (!isCurrentMonth || isPast) {
      btn.classList.add('disabled');
    } else if (isAvailable) {
      // Если есть расписание, показываем как available, иначе просто кликабельно
      if (bookAvailableDays.length > 0) {
        btn.classList.add('available');
      }
      if (bookSelectedDate === iso) {
        btn.classList.add('selected');
      }
      btn.addEventListener('click', function() {
        selectBookDate(iso);
      });
    } else {
      btn.classList.add('disabled');
    }
    
    if (iso === today) btn.classList.add('today');
    
    bookCalendarDaysEl.appendChild(btn);
  }
  
  updateBookCalendarNavButtons();
}

function updateBookCalendarNavButtons() {
  if (!bookPrevMonthBtn || !bookNextMonthBtn || !bookCurrentMonth) return;
  const today = new Date();
  const currentMonthStart = new Date(bookCurrentMonth.getFullYear(), bookCurrentMonth.getMonth(), 1);
  const todayMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  
  bookPrevMonthBtn.disabled = currentMonthStart.getTime() <= todayMonthStart.getTime();
  bookNextMonthBtn.disabled = currentMonthStart.getTime() >= nextMonthStart.getTime();
}

function shiftBookCalendarMonth(delta) {
  if (!bookCurrentMonth) return;
  const next = new Date(bookCurrentMonth);
  next.setMonth(next.getMonth() + delta);
  const today = new Date();
  const todayMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthStartDate = new Date(next.getFullYear(), next.getMonth(), 1);
  
  if (nextMonthStartDate < todayMonthStart || nextMonthStartDate >= new Date(nextMonthStart.getFullYear(), nextMonthStart.getMonth() + 1, 1)) {
    return;
  }
  
  bookCurrentMonth = next;
  renderBookCalendar();
}

function selectBookDate(dateStr) {
  bookSelectedDate = dateStr;
  bookSelectedTime = null;
  
  // Обновить календарь
  renderBookCalendar();
  
  // Обновить выбранную дату
  if (bookSelectedDateEl) {
    bookSelectedDateEl.textContent = formatDateHuman(dateStr);
  }
  
  // Показать доступные временные слоты
  renderBookTimeSlots(dateStr);
  
  // Скрыть кнопку отправки до выбора времени
  if (bookSubmitBtn) {
    bookSubmitBtn.style.display = 'none';
  }
}

function renderBookTimeSlots(dateStr) {
  if (!bookTimeSlotsEl) return;
  
  // Если у тренера нет расписания, показываем все доступные времена
  if (bookAvailableDays.length === 0) {
    bookTimeSlotsEl.innerHTML = '';
    TRAINER_SCHEDULE_AVAILABLE_TIMES.forEach(time => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'book-time-slot-btn';
      btn.textContent = time;
      btn.dataset.time = time;
      
      if (bookSelectedTime === time) {
        btn.classList.add('selected');
      }
      
      btn.addEventListener('click', function() {
        selectBookTime(time);
      });
      
      bookTimeSlotsEl.appendChild(btn);
    });
    return;
  }
  
  const day = bookAvailableDays.find(d => d.date === dateStr);
  if (!day) {
    bookTimeSlotsEl.innerHTML = '<div style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">Нет доступных слотов на эту дату</div>';
    return;
  }
  
  const slots = Array.isArray(day.slots) ? day.slots : [];
  if (slots.length === 0) {
    // Обратная совместимость со старым форматом
    if (day.start && day.end) {
      bookTimeSlotsEl.innerHTML = '<div style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">Тренер работает с ' + day.start + ' до ' + day.end + '</div>';
    } else {
      bookTimeSlotsEl.innerHTML = '<div style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">Нет доступных слотов</div>';
    }
    return;
  }
  
  bookTimeSlotsEl.innerHTML = '';
  slots.forEach(time => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'book-time-slot-btn';
    btn.textContent = time;
    btn.dataset.time = time;
    
    if (bookSelectedTime === time) {
      btn.classList.add('selected');
    }
    
    btn.addEventListener('click', function() {
      selectBookTime(time);
    });
    
    bookTimeSlotsEl.appendChild(btn);
  });
}

function selectBookTime(time) {
  bookSelectedTime = time;
  
  // Обновить визуальное выделение
  if (bookTimeSlotsEl) {
    bookTimeSlotsEl.querySelectorAll('.book-time-slot-btn').forEach(btn => {
      btn.classList.remove('selected');
      if (btn.dataset.time === time) {
        btn.classList.add('selected');
      }
    });
  }
  
  // Показать кнопку отправки
  if (bookSubmitBtn) {
    bookSubmitBtn.style.display = '';
  }
}

function goToBookStep(step) {
  bookCurrentStep = step;
  
  if (bookStep1El) {
    bookStep1El.classList.toggle('hidden', step !== 1);
  }
  if (bookStep2El) {
    bookStep2El.classList.toggle('hidden', step !== 2);
  }
  if (bookBackBtn) {
    bookBackBtn.style.display = step === 2 ? '' : 'none';
  }
  if (bookSubmitBtn) {
    bookSubmitBtn.style.display = (step === 2 && bookSelectedTime) ? '' : 'none';
  }
  
  if (step === 2) {
    initBookCalendar();
  }
}

function updateTrainerAvailabilityForClient(forceResetDate) {
  if (!bookTrainerSel) return;
  const opt = bookTrainerSel.options[bookTrainerSel.selectedIndex];
  if (!opt) return;
  const name = opt.value;
  const email = String(opt.dataset.email || '').trim().toLowerCase();
  const schedule = findTrainerScheduleByLookup({ name, email });
  const today = getTodayDateStr();
  if (schedule && Array.isArray(schedule.days)) {
    currentTrainerAvailabilityDays = schedule.days
      .filter(day => day && day.date && day.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  } else {
    currentTrainerAvailabilityDays = [];
  }
  renderTrainerAvailabilityHintInBooking(schedule);
  syncTrainerDateConstraints(forceResetDate);
}

function renderTrainerAvailabilityHintInBooking(schedule) {
  if (!bookTrainerAvailabilityEl) return;
  if (!schedule || !currentTrainerAvailabilityDays.length) {
    bookTrainerAvailabilityEl.textContent = 'Тренер пока не указал доступные даты, вы можете выбрать любое свободное время.';
    return;
  }
  const preview = currentTrainerAvailabilityDays.slice(0, 5)
    .map(day => {
      const slots = Array.isArray(day.slots) ? day.slots : [];
      const slotsText = slots.length > 0 ? slots.join(', ') : (day.start && day.end ? `${day.start} — ${day.end}` : 'Не указано');
      return `${formatDateHuman(day.date)} • ${slotsText}`;
    })
    .join('<br>');
  bookTrainerAvailabilityEl.innerHTML = `<strong>Ближайшие дни:</strong><br>${preview}`;
}

function syncTrainerDateConstraints(resetDate) {
  if (!bookDateEl) return;
  const today = getTodayDateStr();
  if (currentTrainerAvailabilityDays.length) {
    const minDate = currentTrainerAvailabilityDays[0].date;
    const maxDate = currentTrainerAvailabilityDays[currentTrainerAvailabilityDays.length - 1].date;
    bookDateEl.setAttribute('min', minDate);
    bookDateEl.setAttribute('max', maxDate);
    if (resetDate || !currentTrainerAvailabilityDays.some(day => day.date === bookDateEl.value)) {
      bookDateEl.value = minDate;
      resetDate = true;
    }
  } else {
    bookDateEl.setAttribute('min', today);
    bookDateEl.removeAttribute('max');
    if (!bookDateEl.value || bookDateEl.value < today) {
      bookDateEl.value = today;
      resetDate = true;
    }
  }
  applyMinTimeConstraint(resetDate);
}

function enforceTrainerDateSelection() {
  if (!bookDateEl || !currentTrainerAvailabilityDays.length) return false;
  const picked = bookDateEl.value;
  const exists = currentTrainerAvailabilityDays.some(day => day.date === picked);
  if (!exists) {
    bookDateEl.value = currentTrainerAvailabilityDays[0].date;
    try { showToast && showToast('Тренер не работает в эту дату. Выбрали ближайший доступный день.'); } catch {}
    return true;
  }
  return false;
}

function updateTrainerPhoto() {
  if (!bookTrainerSel || !bookTrainerPhotoEl) return;
  const opt = bookTrainerSel.options[bookTrainerSel.selectedIndex];
  const url = (opt && opt.dataset.photo) || '';
  bookTrainerPhotoEl.src = url;
}

function submitBooking() {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
  if (!(window.isEmailVerified ? window.isEmailVerified(user) : (user && user.emailVerified))) {
    showToast('Подтвердите e‑mail через ссылку в письме, чтобы записываться на тренировки');
    return;
  }
  
  if (!bookSelectedTrainer || !bookSelectedDate || !bookSelectedTime) {
    showToast('Выберите тренера, дату и время');
    return;
  }
  
  const gym = (bookGymEl && bookGymEl.value) || '';
  const trainer = bookSelectedTrainer.name;
  const trainerEmail = String(bookSelectedTrainer.email || '').trim();
  const date = bookSelectedDate;
  const time = bookSelectedTime;
  const notes = (bookNotesEl && bookNotesEl.value.trim()) || '';
  
  if (!gym) { showToast('Выберите зал'); return; }
  
  const meEmail = String(user.email || '').trim().toLowerCase();
  if (trainerEmail && meEmail && trainerEmail.toLowerCase() === meEmail) {
    showToast('Вы не можете записаться к самому себе');
    return;
  }
  const myName = String(user.name || '').trim().toLowerCase();
  if (!trainerEmail && myName && trainer.toLowerCase() === myName) {
    showToast('Вы не можете записаться к самому себе');
    return;
  }
  
  // Проверка: дата не в прошлом
  const today = getTodayDateStr();
  if (date < today) { showToast('Нельзя выбрать прошедшую дату'); return; }
  
  // Проверка: для сегодняшней даты время не раньше текущего + 1 час
  if (date === today) {
    const minTime = getNowPlusMinutes(60);
    if (compareTimes(time, minTime) < 0) {
      showToast(`Для сегодняшней записи выберите время не раньше ${minTime}`);
      return;
    }
  }
  
  // Проверка доступности тренера (если есть расписание)
  if (bookAvailableDays.length > 0) {
    const allowedDay = bookAvailableDays.find(day => day.date === date);
    if (!allowedDay) {
      showToast('Тренер недоступен в выбранную дату');
      return;
    }
    
    // Проверяем, есть ли слоты
    const slots = Array.isArray(allowedDay.slots) ? allowedDay.slots : [];
    if (slots.length > 0) {
      // Проверяем, попадает ли выбранное время в один из слотов
      const timeInSlot = slots.some(slot => {
        const [slotHour, slotMin] = slot.split(':').map(Number);
        const slotStartMinutes = slotHour * 60 + slotMin;
        const slotEndMinutes = slotStartMinutes + TRAINER_SCHEDULE_SLOT_DURATION_HOURS * 60;
        const [timeHour, timeMin] = time.split(':').map(Number);
        const timeMinutes = timeHour * 60 + timeMin;
        return timeMinutes >= slotStartMinutes && timeMinutes < slotEndMinutes;
      });
      if (!timeInSlot) {
        showToast(`Выберите время из доступных слотов: ${slots.join(', ')}`);
        return;
      }
    } else if (allowedDay.start && allowedDay.end) {
      // Обратная совместимость со старым форматом
      if (compareTimes(time, allowedDay.start) < 0 || compareTimes(time, allowedDay.end) > 0) {
        showToast(`В этот день можно выбрать время с ${allowedDay.start} до ${allowedDay.end}`);
        return;
      }
    }
  }
  
  const booking = { id: Date.now(), gym, trainer, trainerEmail, date, time, notes, status: 'planned' };
  const list = Array.isArray(user.bookings) ? user.bookings : [];
  list.push(booking);
  user.bookings = list;
  setCurrentUser(user);
  // Синхронизировать в users
  const users = readUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) { users[idx].bookings = list; writeUsers(users); }
  closeBookModal();
  showToast('Заявка на тренировку создана');
  notifyTrainerAboutBooking({ trainerName: trainer, trainerEmail, booking, client: user });
  // Сохранить запись в Supabase
  try { saveBookingToSupabase({ user, trainer, date, time, notes }).then(() => {}); } catch {}
}

async function saveBookingToSupabase({ user, trainer, date, time, notes }) {
  if (!window.supabase) return;
  try {
    // Убедимся, что пользователь синхронизирован и есть supabaseId
    if (!user.supabaseId && typeof window.syncUserWithSupabase === 'function') {
      await window.syncUserWithSupabase(user);
      user = getCurrentUser();
    }
    const userId = user && user.supabaseId;
    if (!userId) return;
    // Собираем datetime в ISO (локальное -> ISO)
    const localIso = new Date(`${date}T${time}:00`).toISOString();
    const ins = await supabase.from('bookings').insert([
      { user_id: userId, trainer_name: trainer, starts_at: localIso, notes, status: 'scheduled' }
    ]).select('id').limit(1);
    if (ins.error) throw ins.error;
    const insertedId = ins.data && ins.data[0] && ins.data[0].id;
    if (insertedId) {
      // Привяжем supabaseId к локальной броне (по совпадению полей)
      const me = getCurrentUser();
      if (me && Array.isArray(me.bookings)) {
        const idx = me.bookings.findIndex(b => !b.supabaseId && b.trainer === trainer && b.date === date && b.time === time);
        if (idx !== -1) {
          me.bookings[idx].supabaseId = insertedId;
          setCurrentUser(me);
          const users = readUsers();
          const uidx = users.findIndex(u => u.id === me.id);
          if (uidx !== -1) {
            users[uidx].bookings = me.bookings;
            writeUsers(users);
          }
        }
      }
    }
    console.log('[supabase] booking inserted');
  } catch (e) {
    console.warn('[supabase] save booking failed', e);
    try { showToast('Не удалось сохранить запись в БД. Проверьте схему bookings.'); } catch {}
  }
}

function getTodayDateStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getNowPlusMinutes(mins) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + Number(mins || 0));
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function compareTimes(a, b) {
  // a, b в формате HH:MM
  const [ah, am] = String(a || '00:00').split(':').map(Number);
  const [bh, bm] = String(b || '00:00').split(':').map(Number);
  if (ah !== bh) return ah - bh;
  return am - bm;
}

function applyMinTimeConstraint(setDefaultIfNeeded) {
  if (!bookDateEl || !bookTimeEl) return;
  const selectedDate = bookDateEl.value;
  const today = getTodayDateStr();
  let minTime = null;
  let maxTime = null;
  if (currentTrainerAvailabilityDays.length) {
    const day = currentTrainerAvailabilityDays.find(d => d.date === selectedDate);
    if (day) {
      // Проверяем, есть ли слоты
      const slots = Array.isArray(day.slots) ? day.slots : [];
      if (slots.length > 0) {
        const sortedSlots = slots.slice().sort();
        minTime = sortedSlots[0];
        const lastSlot = sortedSlots[sortedSlots.length - 1];
        const [lastHour, lastMin] = lastSlot.split(':').map(Number);
        const endMinutes = lastHour * 60 + lastMin + TRAINER_SCHEDULE_SLOT_DURATION_HOURS * 60;
        const endHour = Math.floor(endMinutes / 60);
        const endMin = endMinutes % 60;
        maxTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
      } else if (day.start && day.end) {
        // Обратная совместимость со старым форматом
        minTime = day.start;
        maxTime = day.end;
      }
      if (maxTime) {
        bookTimeEl.setAttribute('max', maxTime);
      } else {
        bookTimeEl.removeAttribute('max');
      }
    } else {
      bookTimeEl.removeAttribute('max');
    }
  } else {
    bookTimeEl.removeAttribute('max');
  }
  if (selectedDate === today) {
    const nowPlus = getNowPlusMinutes(60);
    if (!minTime || compareTimes(nowPlus, minTime) > 0) {
      minTime = nowPlus;
    }
  }
  if (minTime) {
    bookTimeEl.setAttribute('min', minTime);
  } else {
    bookTimeEl.removeAttribute('min');
  }
  if (setDefaultIfNeeded || !bookTimeEl.value) {
    bookTimeEl.value = minTime || bookTimeEl.value || '09:00';
  }
  if (minTime && compareTimes(bookTimeEl.value, minTime) < 0) {
    bookTimeEl.value = minTime;
  }
  if (maxTime && compareTimes(bookTimeEl.value, maxTime) > 0) {
    bookTimeEl.value = maxTime;
  }
}

function renderUserPlans() {
  const user = getCurrentUser();
  if (!user) return;
  const profilePlans = document.getElementById('profilePlans');
  if (!profilePlans) return;
  const plans = Array.isArray(user.plans) ? user.plans : [];
  profilePlans.innerHTML = '';
  if (!plans.length) {
    const li = document.createElement('li');
    li.textContent = 'Пока нет абонементов';
    profilePlans.appendChild(li);
    return;
  }
  plans.forEach((p) => {
    const li = document.createElement('li');
    
    const title = document.createElement('span');
    title.className = 'plan-title';
    title.textContent = p.title;
    
    const price = document.createElement('span');
    price.className = 'plan-price';
    price.textContent = p.price;
    
    // Добавляем информацию о способе оплаты, если она есть
    let paymentInfo = null;
    if (p.paymentMethod) {
      const paymentMethodNames = {
        'mastercard': 'Mastercard',
        'paypal': 'PayPal',
        'googlepay': 'Google Pay'
      };
      paymentInfo = paymentMethodNames[p.paymentMethod] || 'Неизвестен';
    }
    
    // Вычисляем дату окончания если есть дата покупки
    let expiresInfo = null;
    if (p.purchasedAt) {
      const purchaseDate = new Date(p.purchasedAt);
      const duration = p.duration || 30; // По умолчанию 30 дней
      const expiryDate = new Date(purchaseDate);
      expiryDate.setDate(expiryDate.getDate() + duration);
      
      const now = new Date();
      const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      const daysUntilStart = Math.ceil((purchaseDate - now) / (1000 * 60 * 60 * 24));
      
      // Если абонемент ещё не начался (в будущем)
      if (daysUntilStart > 0) {
        expiresInfo = `Начнётся ${purchaseDate.toLocaleDateString('ru-RU')}, закончится ${expiryDate.toLocaleDateString('ru-RU')}`;
      } else if (daysLeft > 0) {
        expiresInfo = `Действует до: ${expiryDate.toLocaleDateString('ru-RU')} (осталось ${daysLeft} дн.)`;
      } else {
        expiresInfo = `Истек ${expiryDate.toLocaleDateString('ru-RU')}`;
      }
    }
    
    const actions = document.createElement('div');
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-plan-btn';
    delBtn.textContent = 'Удалить абонемент';
    delBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      openDeletePlanCaptchaModal(p);
      return;
      
      if (delBtn.dataset.confirm === 'ready') {
        const u = getCurrentUser();
        if (!u) return;
        const arr = Array.isArray(u.plans) ? u.plans : [];
        const idx = arr.findIndex(pl => pl.title === p.title && pl.purchasedAt === p.purchasedAt);
        if (idx !== -1) arr.splice(idx, 1);
        u.plans = arr;
        setCurrentUser(u);
        const list = readUsers();
        const uidx = list.findIndex(x => x.id === u.id);
        if (uidx !== -1) { list[uidx].plans = arr; writeUsers(list); }
        renderUserPlans();
        showToast('Абонемент удалён');
        return;
      }
      delBtn.textContent = 'Вы уверены? (3)';
      delBtn.setAttribute('disabled', 'true');
      let left = 3;
      const timer = setInterval(() => {
        left -= 1;
        delBtn.textContent = `Вы уверены? (${left})`;
        if (left <= 0) {
          clearInterval(timer);
          delBtn.removeAttribute('disabled');
          delBtn.textContent = 'Удалить абонемент';
          delBtn.dataset.confirm = 'ready';
        }
      }, 1000);
    });
    // Кнопка отметки посещения для разового абонемента
    const type = (p.type || p.planType || '').toLowerCase();
    const isSingle = type === 'single' || (p.duration === 1);
    actions.appendChild(delBtn);
    li.appendChild(title); 
    li.appendChild(price);
    
    // Добавляем информацию о сроке действия
    if (expiresInfo) {
      const expires = document.createElement('span');
      expires.className = 'plan-expires';
      expires.textContent = expiresInfo;
      li.appendChild(expires);
    }
    
    // Добавляем информацию о способе оплаты
    if (paymentInfo) {
      const payment = document.createElement('span');
      payment.className = 'plan-payment';
      payment.textContent = `Оплачено через: ${paymentInfo}`;
      payment.style.color = '#4ecdc4';
      payment.style.fontSize = '0.9rem';
      payment.style.display = 'block';
      payment.style.marginTop = '4px';
      li.appendChild(payment);
    }
    
    li.appendChild(actions);
    profilePlans.appendChild(li);

    // Сохраняем инфо в dataset и добавляем клик для просмотра
    li.dataset.plan = JSON.stringify(p);
    li.addEventListener('click', function(){
      try { const obj = JSON.parse(this.dataset.plan||'{}'); openPlanInfoModal(obj); } catch {}
    });
  });
}

// Делаем функцию доступной глобально
window.renderUserPlans = renderUserPlans;

function parsePlanDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function getPlanStartDate(plan) {
  if (!plan) return null;
  const keys = ['purchasedAt', 'startDate', 'startsAt', 'activatedAt', 'createdAt'];
  for (const key of keys) {
    const dt = parsePlanDate(plan[key]);
    if (dt) return dt;
  }
  return null;
}

function getPlanDurationDays(plan) {
  return Number(plan && (plan.duration || plan.durationDays || plan.lengthDays)) || 30;
}

function getPlanEndDate(plan, startDateOverride) {
  if (!plan) return null;
  const explicit = parsePlanDate(plan.endDate || plan.expiresAt);
  if (explicit) return explicit;
  const start = startDateOverride || getPlanStartDate(plan);
  if (!start) return null;
  const end = new Date(start);
  end.setDate(end.getDate() + getPlanDurationDays(plan));
  return end;
}

function isPlanActive(plan, refDate = new Date()) {
  if (!plan) return false;
  const start = getPlanStartDate(plan);
  const end = getPlanEndDate(plan, start);
  if (!start && !end) return true;
  if (!start) return refDate < end;
  if (!end) return start <= refDate;
  return start <= refDate && refDate < end;
}

function normalizePlansAfterRemoval(plans) {
  if (!Array.isArray(plans) || !plans.length) return plans;
  plans.sort((a, b) => {
    const ad = getPlanStartDate(a);
    const bd = getPlanStartDate(b);
    if (ad && bd) return ad - bd;
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    return 0;
  });
  const now = new Date();
  if (plans.some(plan => isPlanActive(plan, now))) {
    return plans;
  }
  let candidateIndex = -1;
  let candidateDate = null;
  plans.forEach((plan, idx) => {
    const start = getPlanStartDate(plan) || now;
    if (start >= now) {
      if (candidateDate === null || start < candidateDate) {
        candidateDate = start;
        candidateIndex = idx;
      }
    }
  });
  if (candidateIndex !== -1) {
    plans[candidateIndex].purchasedAt = now.toISOString();
    if (plans[candidateIndex].endDate || plans[candidateIndex].expiresAt) {
      const end = new Date(now);
      end.setDate(end.getDate() + getPlanDurationDays(plans[candidateIndex]));
      const iso = end.toISOString();
      if (plans[candidateIndex].endDate) plans[candidateIndex].endDate = iso;
      if (plans[candidateIndex].expiresAt) plans[candidateIndex].expiresAt = iso;
    }
  }
  return plans;
}

// ===== Отметить посещение по разовому абонементу =====
function consumeSingleVisit(plan) {
  // Отмечать посещения может только менеджер в панели менеджера
  try { showToast && showToast('Отметка посещений доступна только менеджеру'); } catch {}
  return;
  /*
  const user = getCurrentUser();
  if (!user) return;
  const list = Array.isArray(user.plans) ? user.plans : [];
  const idx = list.findIndex(pl => pl.title === plan.title && pl.purchasedAt === plan.purchasedAt);
  if (idx === -1) { showToast && showToast('Абонемент не найден'); return; }
  // Удаляем абонемент
  list.splice(idx, 1);
  user.plans = list;
  setCurrentUser(user);
  // Сохраняем в users
  const users = readUsers();
  const uidx = users.findIndex(u => u.id === user.id);
  if (uidx !== -1) { users[uidx].plans = list; }
  // Добавляем запись в историю посещений пользователя
  const now = new Date();
  const rec = {
    title: plan.title || 'Разовое посещение',
    datetime: now.toISOString(),
    date: now.toLocaleDateString('ru-RU'),
    time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  };
  const hist = Array.isArray(users[uidx].visitHistory) ? users[uidx].visitHistory : [];
  hist.unshift(rec);
  users[uidx].visitHistory = hist;
  writeUsers(users);
  // Обновим currentUser историю
  const me = getCurrentUser();
  if (me && me.id === users[uidx].id) {
    me.visitHistory = hist;
    setCurrentUser(me);
  }
  renderUserPlans();
  renderVisitHistory();
  showToast && showToast('Посещение отмечено');
  */
}

function renderVisitHistory() {
  const user = getCurrentUser();
  const block = document.getElementById('visitHistoryBlock');
  const listEl = document.getElementById('visitHistoryList');
  if (!block || !listEl) return;
  const hist = Array.isArray(user && user.visitHistory) ? user.visitHistory : [];
  if (!hist.length) { block.style.display = 'none'; listEl.innerHTML=''; return; }
  block.style.display = '';
  listEl.innerHTML = '';
  hist.slice(0, 20).forEach(h => {
    const li = document.createElement('li');
    li.className = 'visit-history-entry';
    const titleLine = document.createElement('div');
    titleLine.className = 'visit-history-title';
    titleLine.textContent = `${h.date || ''} ${h.time || ''} — ${h.title || 'Посещение'}`;
    const planLine = document.createElement('div');
    planLine.className = 'visit-history-plan';
    const planName = h && h.planTitle ? h.planTitle : (h && h.title ? h.title : 'не указан');
    planLine.textContent = `Абонемент: ${planName}`;
    li.appendChild(titleLine);
    li.appendChild(planLine);
    listEl.appendChild(li);
  });
}
try { window.renderVisitHistory = renderVisitHistory; } catch {}

// ===== Просмотр информации об абонементе =====
function openPlanInfoModal(plan){
  const modal = document.getElementById('planInfoModal');
  if (!modal) return;
  const t = document.getElementById('piTitle');
  const pr = document.getElementById('piPrice');
  const st = document.getElementById('piStart');
  const en = document.getElementById('piEnd');
  const src = document.getElementById('piSource');
  const pay = document.getElementById('piPayment');
  const cardRow = document.getElementById('piCardRow');
  const card = document.getElementById('piCard');
  try {
    t.textContent = plan.title || 'Абонемент';
    pr.textContent = plan.price || '';
    const start = plan.purchasedAt ? new Date(plan.purchasedAt) : null;
    const end = plan.endDate ? new Date(plan.endDate) : (start ? new Date(start.getTime() + (plan.duration||30)*24*3600*1000) : null);
    st.textContent = start ? start.toLocaleDateString('ru-RU') : '-';
    en.textContent = end ? end.toLocaleDateString('ru-RU') : '-';
    src.textContent = plan.source || plan.sourceInfo || (plan.source === 'case' ? 'Кейс' : 'Покупка');
    const pmNames = { mastercard:'Mastercard', paypal:'PayPal', googlepay:'Google Pay', unknown:'неизвестно' };
    pay.textContent = pmNames[(plan.paymentMethod||'unknown')] || plan.paymentMethod || 'неизвестно';
    if (plan.cardLast4){ cardRow.style.display='flex'; card.textContent = `${plan.cardBrand||'Карта'} •••• ${plan.cardLast4}`; } else { cardRow.style.display='none'; card.textContent=''; }
  } catch {}
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function closePlanInfoModal(){
  const modal = document.getElementById('planInfoModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function(){
  const closeBtn = document.querySelector('.planinfo-close');
  const okBtn = document.getElementById('planinfoOk');
  const modal = document.getElementById('planInfoModal');
  if (closeBtn) closeBtn.addEventListener('click', closePlanInfoModal);
  if (okBtn) okBtn.addEventListener('click', closePlanInfoModal);
  if (modal) modal.addEventListener('click', function(e){ if (e.target===modal) closePlanInfoModal(); });
});

try { window.openPlanInfoModal = openPlanInfoModal; window.closePlanInfoModal = closePlanInfoModal; } catch {}

function normalizePhone(input) {
  const digits = String(input || '').replace(/\D+/g, '');
  // Allow Belarus format +375XXXXXXXXX or local 80XXXXXXXXX -> convert to +375
  if (digits.startsWith('375') && digits.length === 12) return '+' + digits;
  if (digits.startsWith('80') && digits.length === 11) return '+375' + digits.slice(2);
  if (digits.startsWith('375') && digits.length > 12) return '+' + digits.slice(0, 12);
  if (digits.startsWith('375') && digits.length < 12) return '';
  if (digits.length === 9) return '+375' + digits; // fallback when user types 9 digits
  return '';
}

function closeProfile() {
  const section = document.getElementById('profile-section');
  const main = document.getElementById('content');
  if (!section || !main) return;
  main.style.display = '';
  section.classList.remove('active');
  setTimeout(() => {
    section.classList.add('hidden');
    main.classList.remove('hidden-content');
    document.body.classList.remove('section-open');
    document.body.classList.remove('profile-open');
  }, 600);
}

// ===== Заявки на тренера =====

// ===== Падающие гантели и шприцы в профиле =====
(function(){
  let canvas, ctx, sprites = [], rafId = 0, lastW = 0, lastH = 0;
  let imgDumbbell = null, imgSyringe = null;
  const DENSITY = 0.00010; // элементов на пиксель

  function loadImages() {
    if (!imgDumbbell) {
      // Рисуем гантель как SVG (регулируем цвета под тему)
      const dark = !document.body.classList.contains('light-theme');
      const metal = dark ? '#e6e6e6' : '#222';
      const grip = dark ? '#bdbdbd' : '#444';
      const svgDb = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
        <g fill='none' stroke='${metal}' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'>
          <rect x='6' y='22' width='10' height='20' rx='2' fill='${metal}'/>
          <rect x='48' y='22' width='10' height='20' rx='2' fill='${metal}'/>
          <rect x='16' y='26' width='32' height='12' rx='2' fill='${grip}' stroke='${grip}'/>
          <line x1='16' y1='26' x2='16' y2='38'/>
          <line x1='48' y1='26' x2='48' y2='38'/>
        </g>
      </svg>`;
      imgDumbbell = new Image();
      imgDumbbell.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgDb);
    }
    if (!imgSyringe) {
      // Простая SVG-«шприц» через data URL
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
        <g fill='none' stroke='${document.body.classList.contains('light-theme') ? '#111' : '#eee'}' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'>
          <path d='M46 10l8 8'/>
          <path d='M14 42l28-28 8 8-28 28z' fill='${document.body.classList.contains('light-theme') ? '#ffdddd' : '#661a1a'}'/>
          <path d='M10 54l8-8'/>
          <path d='M20 44l6 6'/>
          <path d='M24 32l8 8'/>
          <path d='M30 26l8 8'/>
          <path d='M40 16l8 8'/>
        </g>
      </svg>`;
      imgSyringe = new Image();
      imgSyringe.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
  }

  function ensureCanvas() {
    if (canvas && ctx) return;
    canvas = document.getElementById('profileFalling');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    loadImages();
  }

  function createSprites() {
    sprites = [];
    const area = lastW * lastH;
    const count = Math.max(30, Math.floor(area * DENSITY));
    for (let i = 0; i < count; i += 1) {
      const type = Math.random() < 0.55 ? 'db' : 'sr';
      const size = type === 'db' ? 24 + Math.random()*22 : 18 + Math.random()*20;
      sprites.push({
        t: type,
        x: Math.random() * lastW,
        y: Math.random() * lastH,
        s: 0.6 + Math.random() * 1.2, // скорость падения
        r: Math.random() * Math.PI * 2, // начальный угол
        rv: (Math.random() - 0.5) * 0.02, // скорость вращения
        sz: size,
        a: 0.7 + Math.random()*0.3
      });
    }
  }

  function resize() {
    if (!canvas) return;
    const parent = canvas.parentElement;
    const cssW = parent.clientWidth;
    const cssH = parent.scrollHeight; // вся высота контента секции
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx && ctx.setTransform(1,0,0,1,0,0);
    ctx && ctx.scale(dpr, dpr);
    lastW = cssW; lastH = cssH;
    createSprites();
  }

  function drawSprite(sp) {
    const img = sp.t === 'db' ? imgDumbbell : imgSyringe;
    if (!img || !img.complete) return;
    const w = sp.sz, h = sp.sz;
    ctx.save();
    ctx.globalAlpha = sp.a;
    ctx.translate(sp.x, sp.y);
    ctx.rotate(sp.r);
    ctx.drawImage(img, -w/2, -h/2, w, h);
    ctx.restore();
  }

  function tick() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, lastW, lastH);
    for (let i = 0; i < sprites.length; i += 1) {
      const sp = sprites[i];
      sp.y += sp.s;
      sp.r += sp.rv;
      sp.x += Math.sin(sp.y * 0.01) * 0.1; // лёгкое покачивание
      if (sp.y - sp.sz > lastH) {
        sp.y = -sp.sz - Math.random()*30;
        sp.x = Math.random() * lastW;
      }
      drawSprite(sp);
    }
    rafId = requestAnimationFrame(tick);
  }

  function startProfileFalling() {
    ensureCanvas();
    if (!canvas || rafId) return;
    resize();
    rafId = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
  }

  function stopProfileFalling() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    window.removeEventListener('resize', resize);
    if (ctx && lastW && lastH) ctx.clearRect(0, 0, lastW, lastH);
  }

  try { window.startProfileFalling = startProfileFalling; window.stopProfileFalling = stopProfileFalling; } catch {}
})();
function renderTrainerApplications() {
  const user = getCurrentUser();
  if (!user) return;

  const applicationsInfo = document.getElementById('trainerApplicationsInfo');
  if (!applicationsInfo) return;

  try {
    const applications = JSON.parse(localStorage.getItem('trainerApplications') || '{}');
    const userApplications = applications[user.id] || [];
    
    const statusEl = applicationsInfo.querySelector('.applications-status');
    const actionsEl = applicationsInfo.querySelector('.applications-actions');
    
    if (!userApplications.length) {
      statusEl.textContent = 'У вас пока нет заявок на тренера';
      statusEl.className = 'applications-status';
      actionsEl.innerHTML = '';
      return;
    }

    // Сортируем заявки по дате (новые сверху)
    const sortedApplications = userApplications.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Проверяем лимит (1 раз в неделю)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentApplications = sortedApplications.filter(app => {
      const appDate = new Date(app.date);
      return appDate >= oneWeekAgo;
    });

    if (recentApplications.length > 0) {
      const lastApplication = recentApplications[0];
      const daysLeft = Math.ceil((new Date(lastApplication.date).getTime() + 7 * 24 * 60 * 60 * 1000 - new Date().getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysLeft > 0) {
        statusEl.textContent = `Вы уже подавали заявку на этой неделе. Следующая заявка возможна через ${daysLeft} дн.`;
        statusEl.className = 'applications-status warning';
        actionsEl.innerHTML = '';
      } else {
        statusEl.textContent = 'Можете подать новую заявку на тренера';
        statusEl.className = 'applications-status success';
        actionsEl.innerHTML = '';
      }
    } else {
      statusEl.textContent = 'Можете подать заявку на тренера';
      statusEl.className = 'applications-status success';
      actionsEl.innerHTML = '';
    }

    // Показываем список заявок
    let applicationsList = applicationsInfo.querySelector('.applications-list');
    if (!applicationsList) {
      applicationsList = document.createElement('div');
      applicationsList.className = 'applications-list';
      applicationsInfo.appendChild(applicationsList);
    }

    applicationsList.innerHTML = '';
    sortedApplications.forEach(app => {
      const item = document.createElement('div');
      item.className = 'application-item';
      
      const date = new Date(app.date).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const status = app.status || 'pending';
      const statusText = {
        'pending': 'На рассмотрении',
        'approved': 'Принят',
        'rejected': 'Отклонен'
      }[status] || 'На рассмотрении';
      
      const statusClass = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';
      
      item.innerHTML = `
        <div class="application-date">${date}</div>
        <div>Имя: ${app.data.name || 'Не указано'}</div>
        <div>Стаж: ${app.data.experience || 'Не указан'} лет</div>
        <div>Зал: ${app.data.gym === 'nemiga' ? 'Немига Бизнес-центр' : app.data.gym === 'prityckogo' ? 'Притыцкого' : app.data.gym || 'Не указан'}</div>
        <div class="application-status ${statusClass}">Статус: ${statusText}</div>
      `;
      
      applicationsList.appendChild(item);
    });

  } catch (error) {
    console.error('Ошибка при загрузке заявок:', error);
    const statusEl = applicationsInfo.querySelector('.applications-status');
    statusEl.textContent = 'Ошибка при загрузке заявок';
    statusEl.className = 'applications-status error';
  }
}

// ===== Капча для удаления абонемента =====
let deletePlanCaptchaCode = '';
let planToDelete = null;

// Инициализация элементов капчи удаления абонемента
document.addEventListener('DOMContentLoaded', function() {
  const deletePlanModal = document.getElementById('deletePlanCaptchaModal');
  const deletePlanCaptchaImage = document.getElementById('deletePlanCaptchaImage');
  const deletePlanCaptchaRefresh = document.getElementById('deletePlanCaptchaRefresh');
  const deletePlanCaptchaInput = document.getElementById('deletePlanCaptchaInput');
  const deletePlanCaptchaError = document.getElementById('deletePlanCaptchaError');
  const deletePlanCaptchaSubmit = document.getElementById('deletePlanCaptchaSubmit');
  const deletePlanCaptchaClose = document.querySelector('.delete-plan-captcha-close');

  if (deletePlanCaptchaRefresh) {
    deletePlanCaptchaRefresh.addEventListener('click', generateDeletePlanCaptcha);
  }

  if (deletePlanCaptchaSubmit) {
    deletePlanCaptchaSubmit.addEventListener('click', submitDeletePlan);
  }

  if (deletePlanCaptchaClose) {
    deletePlanCaptchaClose.addEventListener('click', closeDeletePlanCaptchaModal);
  }

  if (deletePlanCaptchaInput) {
    deletePlanCaptchaInput.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9]/g, '');
      if (deletePlanCaptchaError) deletePlanCaptchaError.textContent = '';
    });
  }

  if (deletePlanModal) {
    deletePlanModal.addEventListener('click', function(e) {
      if (e.target === deletePlanModal) {
        closeDeletePlanCaptchaModal();
      }
    });
  }
});

function openDeletePlanCaptchaModal(plan) {
  planToDelete = plan;
  const modal = document.getElementById('deletePlanCaptchaModal');
  if (!modal) return;
  
  generateDeletePlanCaptcha();
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  setTimeout(() => {
    const input = document.getElementById('deletePlanCaptchaInput');
    if (input) input.focus();
  }, 100);
}

function closeDeletePlanCaptchaModal() {
  const modal = document.getElementById('deletePlanCaptchaModal');
  if (!modal) return;
  
  modal.classList.add('hidden');
  modal.style.display = 'none';
  document.body.style.overflow = '';
  planToDelete = null;
  
  const input = document.getElementById('deletePlanCaptchaInput');
  const error = document.getElementById('deletePlanCaptchaError');
  if (input) input.value = '';
  if (error) error.textContent = '';
}

function generateDeletePlanCaptcha() {
  deletePlanCaptchaCode = Math.floor(100000 + Math.random() * 900000).toString();
  const captchaImage = document.getElementById('deletePlanCaptchaImage');
  if (captchaImage) {
    captchaImage.textContent = deletePlanCaptchaCode;
  }
}

function submitDeletePlan() {
  const input = document.getElementById('deletePlanCaptchaInput');
  const error = document.getElementById('deletePlanCaptchaError');
  const userInput = input ? input.value.trim() : '';
  
  if (!userInput) {
    if (error) error.textContent = 'Введите код с картинки';
    return;
  }
  
  if (userInput !== deletePlanCaptchaCode) {
    if (error) error.textContent = 'Неверный код. Попробуйте ещё раз.';
    generateDeletePlanCaptcha();
    if (input) input.value = '';
    return;
  }
  
  // Код верный, удаляем абонемент
  if (!planToDelete) {
    showToast('Ошибка: данные абонемента не найдены');
    closeDeletePlanCaptchaModal();
    return;
  }
  
  const user = getCurrentUser();
  if (!user) {
    showToast('Ошибка: пользователь не найден');
    closeDeletePlanCaptchaModal();
    return;
  }
  
  const arr = Array.isArray(user.plans) ? user.plans : [];
  const idx = arr.findIndex(pl => pl.title === planToDelete.title && pl.purchasedAt === planToDelete.purchasedAt);
  
  if (idx !== -1) {
    arr.splice(idx, 1);
    normalizePlansAfterRemoval(arr);
    user.plans = arr;
    setCurrentUser(user);
    
    const users = readUsers();
    const uidx = users.findIndex(x => x.id === user.id);
    if (uidx !== -1) {
      users[uidx].plans = arr;
      writeUsers(users);
    }
    
    renderUserPlans();
    showToast('Абонемент удалён');
  }
  
  closeDeletePlanCaptchaModal();
}

// Делаем функцию доступной глобально
window.openDeletePlanCaptchaModal = openDeletePlanCaptchaModal;
window.closeDeletePlanCaptchaModal = closeDeletePlanCaptchaModal;

