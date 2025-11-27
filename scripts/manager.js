function initManager() {
  const managerLink = document.getElementById('managerLink');
  const managerSection = document.getElementById('manager-section');
  const mainContent = document.getElementById('content');

  if (managerLink && managerSection && mainContent) {
    managerLink.addEventListener('click', function(e) {
      e.preventDefault();
      openManagerSection();
    });
  }

  // Открытие по хэшу при загрузке
  try { if (location.hash === '#manager') { openManagerSection(); } } catch {}
  // Реакция на смену хэша
  window.addEventListener('hashchange', function() {
    try {
      if (location.hash === '#manager') { openManagerSection(); }
    } catch {}
  });
}

document.addEventListener('DOMContentLoaded', initManager);
window.addEventListener('partials:loaded', initManager);

function openManagerSection() {
  try {
    const managerSection = document.getElementById('manager-section');
    const mainContent = document.getElementById('content');
    if (!managerSection || !mainContent) return;
    if (!isManager()) { try { showToast('Доступ только для менеджера'); } catch {} return; }
    // Закрыть возможные другие секции
    try {
      const adminSection = document.getElementById('admin-section');
      if (adminSection && adminSection.classList.contains('active')) {
        adminSection.classList.remove('active');
        setTimeout(() => { adminSection.classList.add('hidden'); }, 600);
      }
    } catch {}
    mainContent.classList.add('hidden-content');
    managerSection.classList.remove('hidden');
    setTimeout(() => { managerSection.classList.add('active'); }, 10);
    setTimeout(() => { mainContent.style.display = 'none'; }, 600);
    document.body.classList.add('section-open');
    renderManagerPlans();
    renderManagerUsers();
    renderManagerBookings();
  } catch {}
}

function closeManager() {
  try {
    const managerSection = document.getElementById('manager-section');
    const mainContent = document.getElementById('content');
    if (!managerSection || !mainContent) return;
    mainContent.style.display = '';
    managerSection.classList.remove('active');
    setTimeout(() => {
      managerSection.classList.add('hidden');
      document.body.classList.remove('section-open');
      mainContent.classList.remove('hidden-content');
    }, 600);
  } catch {}
}

function isManager() {
  try {
    const u = getCurrentUser();
    const roles = (u && Array.isArray(u.roles)) ? u.roles : [];
    const roleStr = String(u && u.role || '').toLowerCase();
    return !!(u && (u.isManager || roles.includes('manager') || roleStr === 'manager'));
  } catch { return false; }
}

// Данные посещений: { userId: { count: number, records: [{date,time,attended}] } }
function readVisitData() {
  try {
    const raw = localStorage.getItem('user_visit_data');
    if (raw) return JSON.parse(raw);
    const legacy = JSON.parse(localStorage.getItem('user_one_time_visits') || '{}');
    const migrated = {};
    Object.keys(legacy || {}).forEach(k => { migrated[k] = { count: Number(legacy[k]||0), records: [] }; });
    return migrated;
  } catch { return {}; }
}

function writeVisitData(map) { localStorage.setItem('user_visit_data', JSON.stringify(map || {})); }

function getVisitCount(userId) {
  const d = readVisitData()[String(userId)];
  return d && typeof d.count === 'number' ? d.count : 0;
}

function setVisitCount(userId, next) {
  const data = readVisitData();
  const key = String(userId);
  if (!data[key]) data[key] = { count: 0, records: [] };
  data[key].count = Math.max(0, Number(next) || 0);
  writeVisitData(data);
}

function incVisitForUser(userId) { setVisitCount(userId, getVisitCount(userId) + 1); }
function decVisitForUser(userId) { setVisitCount(userId, getVisitCount(userId) - 1); }

function addVisitRecord(userId, rec) {
  const data = readVisitData();
  const key = String(userId);
  if (!data[key]) data[key] = { count: 0, records: [] };
  const safe = {
    date: (rec && rec.date) || '',
    time: (rec && rec.time) || '',
    attended: !!(rec && rec.attended),
    planTitle: rec && rec.planTitle ? String(rec.planTitle) : '',
    planKey: rec && rec.planKey ? String(rec.planKey) : ''
  };
  data[key].records = Array.isArray(data[key].records) ? data[key].records : [];
  data[key].records.unshift(safe);
  if (data[key].records.length > 10) data[key].records = data[key].records.slice(0, 10);
  writeVisitData(data);
}

function getVisitRecords(userId) {
  const d = readVisitData()[String(userId)];
  return (d && Array.isArray(d.records)) ? d.records : [];
}

function buildPlanKey(plan) {
  if (!plan) return '';
  if (plan.id) return String(plan.id);
  if (plan.planId) return String(plan.planId);
  if (plan.supabaseId) return String(plan.supabaseId);
  const title = String(plan.title || plan.name || 'plan').replace(/\s+/g, '_');
  const purchased = String(plan.purchasedAt || plan.createdAt || plan.startDate || '');
  return `${title}__${purchased}`;
}

function fillVisitHistoryPanel(panel, userId) {
  if (!panel) return;
  panel.innerHTML = '';
  const records = getVisitRecords(userId);
  if (!records.length) {
    const empty = document.createElement('div');
    empty.className = 'visit-history-empty';
    empty.textContent = 'Посещений пока нет';
    panel.appendChild(empty);
    return;
  }
  records.forEach((rec) => {
    const item = document.createElement('div');
    item.className = 'visit-history-item';
    const status = rec.attended ? 'посетил' : 'не пришёл';

    const main = document.createElement('div');
    main.className = 'visit-history-row-main';
    main.textContent = `${rec.date || '-'} ${rec.time || ''} — ${status}`;

    const planLine = document.createElement('div');
    planLine.className = 'visit-history-plan';
    planLine.textContent = `Абонемент: ${rec.planTitle ? rec.planTitle : 'не указан'}`;

    item.appendChild(main);
    item.appendChild(planLine);
    panel.appendChild(item);
  });
}

function renderManagerUsers() {
  const host = document.getElementById('managerUsersList');
  if (!host) return;
  host.innerHTML = '';
  if (!isManager()) {
    const warn = document.createElement('div');
    warn.className = 'bookings-empty';
    warn.textContent = 'Доступ только для менеджера';
    host.appendChild(warn);
    return;
  }
  const users = readUsers();
  if (!users.length) {
    const empty = document.createElement('div');
    empty.className = 'bookings-empty';
    empty.textContent = 'Пользователей нет';
    host.appendChild(empty);
    return;
  }
  users.forEach((u) => {
    const item = document.createElement('div');
    item.className = 'admin-user';
    const head = document.createElement('div');
    head.className = 'admin-head';
    const name = document.createElement('div');
    name.innerHTML = `<strong>${u.name || u.email}</strong> <span class="admin-meta">${u.email}</span>`;
    const actions = document.createElement('div');
    actions.className = 'admin-actions';

    // Счётчик посещений скрыт: менеджер не ставит посещения вручную
    const count = document.createElement('span');
    count.className = 'admin-meta';
    count.textContent = `Посещения: ${getVisitCount(u.id)}`;

    // Менеджер видит счётчик и последние записи, но не может ставить посещения напрямую
    actions.appendChild(count);

    // Последние записи
    const recordsWrap = document.createElement('div');
    recordsWrap.className = 'plans-list';
    recordsWrap.style.marginTop = '8px';

    function renderRecords() {
      const records = getVisitRecords(u.id).slice(0, 3);
      recordsWrap.innerHTML = '';
      if (!records.length) {
        const empty = document.createElement('div');
        empty.className = 'admin-meta';
        empty.textContent = 'Записей пока нет';
        recordsWrap.appendChild(empty);
        return;
      }
      records.forEach(r => {
        const row = document.createElement('div');
        row.className = 'admin-meta';
        const text = document.createElement('span');
        text.textContent = `${r.date} ${r.time} — ${r.attended ? 'посетил' : 'не пришёл'}`;
        const del = document.createElement('button');
        del.className = 'profile-btn';
        del.style.marginLeft = '8px';
        del.textContent = 'Удалить';
        del.addEventListener('click', function() {
          managerDeleteVisitRecord(u.id, r);
          renderRecords();
        });
        row.appendChild(text);
        row.appendChild(del);
        recordsWrap.appendChild(row);
      });
    }

    renderRecords();
    head.appendChild(name);
    head.appendChild(actions);
    item.appendChild(head);
    item.appendChild(recordsWrap);
    host.appendChild(item);
  });
}

// сделать функции доступными глобально при необходимости
try {
  window.closeManager = closeManager;
  window.openManagerSection = openManagerSection;
  window.renderManagerPlans = renderManagerPlans;
  window.renderManagerUsers = renderManagerUsers;
  window.renderManagerBookings = renderManagerBookings;
} catch {}

// ========== Бронирования: показать всем менеджеру и отметить пришёл/не пришёл ==========
function readAllUsers() { return readUsers(); }

// ===== Абонементы пользователей для менеджера =====
function renderManagerPlans() {
  const host = document.getElementById('managerPlansList');
  if (!host) return;
  host.innerHTML = '';
  if (!isManager()) {
    const warn = document.createElement('div');
    warn.className = 'bookings-empty';
    warn.textContent = 'Доступ только для менеджера';
    host.appendChild(warn);
    return;
  }
  const users = readAllUsers();
  if (!users.length) {
    const empty = document.createElement('div');
    empty.className = 'bookings-empty';
    empty.textContent = 'Пользователей нет';
    host.appendChild(empty);
    return;
  }
  users.forEach(u => {
    const item = document.createElement('div');
    item.className = 'admin-user';
    const head = document.createElement('div');
    head.className = 'admin-head';
    const name = document.createElement('div');
    name.innerHTML = `<strong>${u.name || u.email}</strong> <span class="admin-meta">${u.email}</span>`;

    const plansWrap = document.createElement('div');
    plansWrap.className = 'plans-list';
    plansWrap.style.marginTop = '8px';

    const plans = Array.isArray(u.plans) ? u.plans : [];
    if (!plans.length) {
      const tag = document.createElement('span');
      tag.className = 'admin-tag';
      tag.textContent = 'Абонементов нет';
      plansWrap.appendChild(tag);
    } else {
      plans.forEach((p, idx) => {
        const row = document.createElement('div');
        row.className = 'booking-item admin manager-plan-card';
        const title = document.createElement('div');
        title.className = 'booking-title';
        title.textContent = p.title || 'Абонемент';
        const meta = document.createElement('div');
        meta.className = 'booking-meta';
        const start = p.purchasedAt ? new Date(p.purchasedAt) : null;
        const end = p.endDate ? new Date(p.endDate) : (start ? new Date(start.getTime() + (p.duration||30)*24*3600*1000) : null);
        meta.textContent = `${start ? start.toLocaleDateString('ru-RU') : '-'} — ${end ? end.toLocaleDateString('ru-RU') : '-'}`;
        const actions = document.createElement('div');
        actions.className = 'booking-actions';
        // Кнопка менеджера: отметить посещение по данному абонементу (walk‑in)
        const markBtn = document.createElement('button');
        markBtn.className = 'profile-btn';
        markBtn.textContent = 'Отметить посещение';
        markBtn.addEventListener('click', function() {
          managerAddVisitForPlan(u.id, p);
        });
        actions.appendChild(markBtn);
        const hint = document.createElement('span');
        hint.className = 'manager-plan-hint';
        hint.textContent = 'Нажмите на карточку, чтобы увидеть посещения';
        actions.appendChild(hint);

        row.appendChild(title);
        row.appendChild(actions);
        row.appendChild(meta);
        const visitsPanel = document.createElement('div');
        visitsPanel.className = 'visit-history-panel';
        fillVisitHistoryPanel(visitsPanel, u.id);

        row.addEventListener('click', function(e) {
          if (e.target.closest('button')) return;
          const opened = visitsPanel.classList.toggle('visible');
          row.classList.toggle('expanded', opened);
        });

        plansWrap.appendChild(row);
        plansWrap.appendChild(visitsPanel);
      });
    }

    head.appendChild(name);
    item.appendChild(head);
    item.appendChild(plansWrap);
    host.appendChild(item);
  });
}

// Менеджер больше не списывает разовые абонементы вручную

function readAllBookings() {
  const users = readAllUsers();
  const list = [];
  users.forEach(u => {
    const bookings = Array.isArray(u.bookings) ? u.bookings : [];
    bookings.forEach(b => {
      list.push({
        userId: u.id,
        userName: u.name || u.email,
        userEmail: u.email,
        bookingId: b.id,
        trainer: b.trainer,
        date: b.date,
        time: b.time,
        notes: b.notes || '',
        status: b.status || 'planned',
        planTitle: b.planTitle || '',
        planKey: b.planKey || '',
        plans: Array.isArray(u.plans) ? u.plans : []
      });
    });
  });
  // Сортировка по дате/времени ближайшие сверху
  list.sort((a, b) => {
    const ad = (a.date || '') + 'T' + (a.time || '');
    const bd = (b.date || '') + 'T' + (b.time || '');
    return ad.localeCompare(bd);
  });
  return list;
}

function writeBookingStatus(userId, bookingId, status, opts) {
  const options = opts || {};
  const users = readUsers();
  const uidx = users.findIndex(u => u.id === userId);
  if (uidx === -1) return;
  const bookings = Array.isArray(users[uidx].bookings) ? users[uidx].bookings : [];
  const bidx = bookings.findIndex(b => b.id === bookingId);
  if (bidx === -1) return;
  bookings[bidx].status = status; // planned | attended | missed | cancelled
  if (options.planTitle) bookings[bidx].planTitle = options.planTitle;
  if (options.planKey) bookings[bidx].planKey = options.planKey;
  users[uidx].bookings = bookings;
  writeUsers(users);
  // Если текущий пользователь — этот же, синхронизируем currentUser
  const me = getCurrentUser();
  if (me && me.id === userId) {
    me.bookings = bookings;
    setCurrentUser(me);
  }
  // Добавим запись в историю посещений пользователя и в менеджерские данные
  try {
    const booking = bookings[bidx] || {};
    const date = booking.date || '';
    const time = booking.time || '';
    const attended = status === 'attended';
    const effectivePlanTitle = options.planTitle || booking.planTitle || '';
    const effectivePlanKey = options.planKey || booking.planKey || '';
    if (status === 'attended' || status === 'missed') {
      // 1) Запись для менеджерского раздела (счётчик и последние записи)
      addVisitRecord(userId, { date, time, attended, planTitle: effectivePlanTitle, planKey: effectivePlanKey });
      if (attended) incVisitForUser(userId);
      // 2) Запись в историю в профиле пользователя (users[].visitHistory)
      const title = booking.trainer ? `Тренировка (${booking.trainer})` : 'Тренировка';
      const rec = {
        title,
        datetime: (date && time) ? new Date(`${date}T${time}:00`).toISOString() : new Date().toISOString(),
        date,
        time,
        planTitle: effectivePlanTitle || title,
        planKey: effectivePlanKey
      };
      const hist = Array.isArray(users[uidx].visitHistory) ? users[uidx].visitHistory : [];
      // Удалим возможный дубликат по дате/времени и заголовку
      const dupIdx = hist.findIndex(h => (h.date === rec.date && h.time === rec.time && (h.title || '') === rec.title));
      if (dupIdx !== -1) hist.splice(dupIdx, 1);
      hist.unshift(rec);
      // Ограничим размер истории
      if (hist.length > 50) hist.length = 50;
      users[uidx].visitHistory = hist;
      writeUsers(users);
      // синхронизировать currentUser, если он же
      const cur = getCurrentUser();
      if (cur && cur.id === users[uidx].id) {
        cur.visitHistory = hist;
        setCurrentUser(cur);
        try { if (typeof renderVisitHistory === 'function') renderVisitHistory(); } catch {}
      }
    }
  } catch {}
}

// ===== Менеджер: отметить посещение по абонементу пользователя =====
function managerAddVisitForPlan(userId, plan) {
  try {
    const users = readUsers();
    const uidx = users.findIndex(u => u.id === userId);
    if (uidx === -1) return;
    const now = new Date();
    const date = now.toLocaleDateString('ru-RU');
    const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    // Ограничение: не более одной отметки в день
    const existingHist = Array.isArray(users[uidx].visitHistory) ? users[uidx].visitHistory : [];
    const alreadyToday = existingHist.some(h => h && h.date === date);
    if (alreadyToday) {
      try { showToast('Сегодня уже есть отметка посещения для этого пользователя'); } catch {}
      return;
    }
    // 1) Добавим запись в историю пользователя
    const title = plan && (plan.title || (plan.type === 'single' ? 'Разовое посещение' : 'Посещение по абонементу')) || 'Посещение';
    const planKey = buildPlanKey(plan);
    const rec = {
      title,
      datetime: now.toISOString(),
      date,
      time,
      planTitle: plan && (plan.title || plan.name) || title,
      planKey
    };
    const hist = Array.isArray(users[uidx].visitHistory) ? users[uidx].visitHistory : [];
    hist.unshift(rec);
    if (hist.length > 50) hist.length = 50;
    users[uidx].visitHistory = hist;
    // 2) Если абонемент разовый — спишем его
    try {
      const type = String(plan && (plan.type || plan.planType) || '').toLowerCase();
      const isSingle = type === 'single' || (plan && plan.duration === 1);
      if (isSingle) {
        const arr = Array.isArray(users[uidx].plans) ? users[uidx].plans : [];
        const idx = arr.findIndex(pl => pl && plan && pl.title === plan.title && pl.purchasedAt === plan.purchasedAt);
        if (idx !== -1) arr.splice(idx, 1);
        users[uidx].plans = arr;
      }
    } catch {}
    // 3) Сохраним и синхронизируем currentUser
    writeUsers(users);
    const me = getCurrentUser();
    if (me && me.id === users[uidx].id) {
      me.visitHistory = users[uidx].visitHistory;
      if (Array.isArray(users[uidx].plans)) me.plans = users[uidx].plans;
      setCurrentUser(me);
      try { if (typeof renderVisitHistory === 'function') renderVisitHistory(); } catch {}
    }
    // 4) Обновим менеджерские данные посещений
    addVisitRecord(userId, { date, time, attended: true, planTitle: plan && (plan.title || plan.name), planKey });
    incVisitForUser(userId);
    // 5) Обновим списки в панели и сообщим
    try { renderManagerPlans(); renderManagerUsers(); } catch {}
    try { showToast('Посещение отмечено'); } catch {}
  } catch (e) {
    console.warn('managerAddVisitForPlan failed', e);
    try { showToast('Не удалось отметить посещение'); } catch {}
  }
}

// Удаление записи посещения менеджером
function managerDeleteVisitRecord(userId, rec) {
  try {
    const date = rec && rec.date;
    const time = rec && rec.time;
    const attended = !!(rec && rec.attended);
    // 1) Удалим из менеджерских данных
    const data = readVisitData();
    const key = String(userId);
    if (data[key] && Array.isArray(data[key].records)) {
      const idx = data[key].records.findIndex(r => r && r.date === date && r.time === time);
      if (idx !== -1) {
        data[key].records.splice(idx, 1);
        writeVisitData(data);
        if (attended) decVisitForUser(userId);
      }
    }
    // 2) Удалим из истории пользователя
    const users = readUsers();
    const uidx = users.findIndex(u => u.id === userId);
    if (uidx !== -1) {
      const hist = Array.isArray(users[uidx].visitHistory) ? users[uidx].visitHistory : [];
      const hidx = hist.findIndex(h => h && h.date === date && h.time === time);
      if (hidx !== -1) {
        hist.splice(hidx, 1);
        users[uidx].visitHistory = hist;
        writeUsers(users);
        const me = getCurrentUser();
        if (me && me.id === users[uidx].id) {
          me.visitHistory = hist;
          setCurrentUser(me);
          try { if (typeof renderVisitHistory === 'function') renderVisitHistory(); } catch {}
        }
      }
    }
    try { showToast('Запись посещения удалена'); } catch {}
  } catch (e) {
    console.warn('managerDeleteVisitRecord failed', e);
    try { showToast('Не удалось удалить запись посещения'); } catch {}
  }
}

function deleteBooking(userId, bookingId) {
  const users = readUsers();
  const uidx = users.findIndex(u => u.id === userId);
  if (uidx === -1) return;
  const bookings = Array.isArray(users[uidx].bookings) ? users[uidx].bookings : [];
  const next = bookings.filter(b => b.id !== bookingId);
  users[uidx].bookings = next;
  writeUsers(users);
  const me = getCurrentUser();
  if (me && me.id === userId) {
    me.bookings = next;
    setCurrentUser(me);
  }
}

function renderManagerBookings() {
  const host = document.getElementById('managerBookingsList');
  if (!host) return;
  host.innerHTML = '';
  if (!isManager()) {
    const warn = document.createElement('div');
    warn.className = 'bookings-empty';
    warn.textContent = 'Доступ только для менеджера';
    host.appendChild(warn);
    return;
  }
  const list = readAllBookings();
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'bookings-empty';
    empty.textContent = 'Записей на тренировки нет';
    host.appendChild(empty);
    return;
  }
  list.forEach(rec => {
    const item = document.createElement('div');
    item.className = 'admin-user';
    const head = document.createElement('div');
    head.className = 'admin-head';
    const name = document.createElement('div');
    name.innerHTML = `<strong>${rec.userName}</strong> <span class=\"admin-meta\">${rec.userEmail}</span>`;
    const actions = document.createElement('div');
    actions.className = 'admin-actions';

    const desc = document.createElement('div');
    desc.className = 'admin-meta';
    desc.style.marginRight = '12px';
    desc.textContent = `${rec.date} ${rec.time} • Тренер: ${rec.trainer}`;

    const statusEl = document.createElement('span');
    statusEl.className = 'admin-meta';
    statusEl.style.marginRight = '12px';
    const mapStatus = { planned: 'запланировано', attended: 'посетил', missed: 'не пришёл', cancelled: 'отменена' };
    statusEl.textContent = `Статус: ${mapStatus[rec.status] || rec.status}`;

    const planWrap = document.createElement('div');
    planWrap.className = 'manager-plan-select-wrap';
    const planLabel = document.createElement('span');
    planLabel.textContent = 'Абонемент:';
    const planSelect = document.createElement('select');
    planSelect.className = 'manager-plan-select';
    const planMap = {};
    const plans = Array.isArray(rec.plans) ? rec.plans : [];
    if (!plans.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Абонементов нет';
      planSelect.appendChild(opt);
      planSelect.disabled = true;
    } else {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Выберите абонемент';
      planSelect.appendChild(placeholder);
      plans.forEach(plan => {
        const key = buildPlanKey(plan);
        const title = plan.title || 'Абонемент';
        planMap[key] = { title, planKey: key };
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = title;
        planSelect.appendChild(opt);
      });
      if (rec.planKey && planMap[rec.planKey]) {
        planSelect.value = rec.planKey;
      } else if (rec.planTitle) {
        const fallbackKey = `arch_${rec.bookingId}`;
        planMap[fallbackKey] = { title: rec.planTitle, planKey: rec.planKey || fallbackKey };
        const opt = document.createElement('option');
        opt.value = fallbackKey;
        opt.textContent = `${rec.planTitle} (архив)`;
        planSelect.appendChild(opt);
        planSelect.value = fallbackKey;
      }
    }
    function getSelectedPlanMeta() {
      const val = planSelect.value;
      if (!val || !planMap[val]) return null;
      return planMap[val];
    }
    planWrap.appendChild(planLabel);
    planWrap.appendChild(planSelect);

    const okBtn = document.createElement('button');
    okBtn.className = 'profile-btn';
    okBtn.textContent = 'Пришёл';
    okBtn.addEventListener('click', function() {
      if (planSelect.disabled) {
        try { showToast('У пользователя нет активных абонементов'); } catch {}
        return;
      }
      const meta = getSelectedPlanMeta();
      if (!meta) {
        try { showToast('Выберите абонемент перед отметкой'); } catch {}
        return;
      }
      writeBookingStatus(rec.userId, rec.bookingId, 'attended', { planTitle: meta.title, planKey: meta.planKey });
      statusEl.textContent = 'Статус: посетил';
      try { showToast('Отмечено как посетил'); } catch {}
    });

    const missBtn = document.createElement('button');
    missBtn.className = 'profile-btn';
    missBtn.textContent = 'Не пришёл';
    missBtn.addEventListener('click', function() {
      const meta = getSelectedPlanMeta();
      writeBookingStatus(rec.userId, rec.bookingId, 'missed', meta ? { planTitle: meta.title, planKey: meta.planKey } : {});
      statusEl.textContent = 'Статус: не пришёл';
      try { showToast('Отмечено как не пришёл'); } catch {}
    });

    const plannedBtn = document.createElement('button');
    plannedBtn.className = 'profile-btn';
    plannedBtn.textContent = 'Запланировано';
    plannedBtn.addEventListener('click', function() {
      writeBookingStatus(rec.userId, rec.bookingId, 'planned');
      statusEl.textContent = 'Статус: запланировано';
      try { showToast('Статус возвращён: запланировано'); } catch {}
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'profile-btn';
    cancelBtn.textContent = 'Отменить';
    cancelBtn.addEventListener('click', function() {
      writeBookingStatus(rec.userId, rec.bookingId, 'cancelled');
      statusEl.textContent = 'Статус: отменена';
      try { showToast('Запись отменена'); } catch {}
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'profile-btn';
    delBtn.textContent = 'Удалить';
    delBtn.addEventListener('click', function() {
      deleteBooking(rec.userId, rec.bookingId);
      try { showToast('Запись удалена'); } catch {}
      renderManagerBookings();
    });

    actions.appendChild(desc);
    actions.appendChild(statusEl);
    actions.appendChild(planWrap);
    actions.appendChild(okBtn);
    actions.appendChild(missBtn);
    actions.appendChild(plannedBtn);
    actions.appendChild(cancelBtn);
    actions.appendChild(delBtn);

    head.appendChild(name);
    head.appendChild(actions);
    item.appendChild(head);
    host.appendChild(item);
  });
}


