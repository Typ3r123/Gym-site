function initAdmin() {
  const adminLink = document.getElementById('adminLink');
  const adminSection = document.getElementById('admin-section');
  const mainContent = document.getElementById('content');

  if (adminLink && adminSection && mainContent) {
    adminLink.addEventListener('click', function(e) {
      e.preventDefault();
      mainContent.classList.add('hidden-content');
      adminSection.classList.remove('hidden');
      setTimeout(() => { adminSection.classList.add('active'); }, 10);
      setTimeout(() => { mainContent.style.display = 'none'; }, 600);
      document.body.classList.add('section-open');
      renderAdminUsers();
      renderAdminBookings();
      renderAdminApplications();
      renderAdminTrainers();
      renderAdminSubscriptions();
    });
  }
}

document.addEventListener('DOMContentLoaded', initAdmin);
window.addEventListener('partials:loaded', initAdmin);

const ORIGINAL_TRAINERS_DATA = [
  {
    id: 'original_1',
    name: 'Винокуров Илья',
    description: 'Сертифицированный тренер по силовым тренировкам',
    photo: 'images/pepsiman.jpg',
    gym: 'nemiga',
    specialization: 'Силовые тренировки',
    experience: 5,
    email: 'ilya.vinokurov@purepulse.by'
  },
  {
    id: 'original_2',
    name: 'Анастасия Павловна',
    description: 'Эксперт по функциональному тренингу и йоге',
    photo: 'images/3.jpg',
    gym: 'prityckogo',
    specialization: 'Функциональный тренинг, Йога',
    experience: 7,
    email: 'anastasia.pavlovna@purepulse.by'
  },
  {
    id: 'original_3',
    name: 'Шаповалов сигмович',
    description: 'Тренер по кроссфиту и восстановлению после травм',
    photo: 'images/2.jpg',
    gym: 'nemiga',
    specialization: 'Кроссфит, Реабилитация',
    experience: 4,
    email: 'shapovalov.sigmovich@purepulse.by'
  },
  {
    id: 'original_4',
    name: 'Петушков Александр',
    description: 'Тренер по бодибилдингу и жирмаксингу',
    photo: 'images/1.jpg',
    gym: 'prityckogo',
    specialization: 'Бодибилдинг, Похудение',
    experience: 6,
    email: 'alexander.petushkov@purepulse.by'
  },
  {
    id: 'original_5',
    name: 'Виталий Цаль',
    description: 'Эксперт по боксу',
    photo: 'images/papich.jpg',
    gym: 'nemiga',
    specialization: 'Бокс, Боевые искусства',
    experience: 8,
    email: 'vitaly.tsal@purepulse.by'
  }
];

function getHiddenOriginalTrainerIds() {
  try {
    return JSON.parse(localStorage.getItem('hiddenOriginalTrainers') || '[]');
  } catch {
    return [];
  }
}

function getOriginalTrainersWithState() {
  const hidden = getHiddenOriginalTrainerIds();
  return ORIGINAL_TRAINERS_DATA.map(trainer => ({
    ...trainer,
    isOriginal: true,
    isHidden: hidden.includes(trainer.id)
  }));
}

function splitCustomTrainers() {
  const trainers = getTrainers();
  const overrides = [];
  const created = [];
  trainers.forEach(t => {
    if (String(t.id || '').startsWith('original_')) {
      overrides.push(t);
    } else {
      created.push(t);
    }
  });
  return { overrides, created };
}

function mergeTrainersForDisplay() {
  const originals = getOriginalTrainersWithState();
  const { overrides, created } = splitCustomTrainers();
  const overrideMap = new Map(overrides.map(t => [String(t.id), t]));
  const mergedOriginals = originals.map(orig => {
    const override = overrideMap.get(orig.id);
    if (override) {
      return {
        ...orig,
        ...override,
        isOriginal: true,
        isHidden: orig.isHidden
      };
    }
    return orig;
  });
  const createdWithFlags = created.map(t => ({ ...t, isOriginal: false, isHidden: false }));
  return { mergedOriginals, createdTrainers: createdWithFlags };
}

function getAllTrainerRecords() {
  const { overrides, created } = splitCustomTrainers();
  const overrideMap = new Map(overrides.map(t => [String(t.id), t]));
  const originals = ORIGINAL_TRAINERS_DATA.map(orig => overrideMap.get(orig.id) || orig);
  return [...originals, ...created];
}

function isTrainerEmailTaken(email, excludeId) {
  const target = String(email || '').trim().toLowerCase();
  if (!target) return false;
  const entries = getAllTrainerRecords();
  return entries.some(entry => {
    if (!entry || !entry.email) return false;
    const entryEmail = String(entry.email).trim().toLowerCase();
    if (!entryEmail) return false;
    const entryId = String(entry.id || '');
    if (excludeId && String(excludeId) === entryId) return false;
    return entryEmail === target;
  });
}

function getTrainerDataById(id) {
  if (!id) return null;
  const trainers = getTrainers();
  let trainer = trainers.find(t => String(t.id) === String(id));
  if (!trainer && String(id).startsWith('original_')) {
    const orig = ORIGINAL_TRAINERS_DATA.find(t => t.id === id);
    if (orig) trainer = { ...orig };
  }
  return trainer || null;
}

function closeAdmin() {
  const adminSection = document.getElementById('admin-section');
  const mainContent = document.getElementById('content');
  if (!adminSection || !mainContent) return;
  mainContent.style.display = '';
  adminSection.classList.remove('active');
  setTimeout(() => {
    adminSection.classList.add('hidden');
    mainContent.classList.remove('hidden-content');
    document.body.classList.remove('section-open');
  }, 600);
}

function renderAdminUsers() {
  const host = document.getElementById('adminUsersList');
  if (!host) return;
  const users = readUsers();
  const me = getCurrentUser();
  host.innerHTML = '';
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
    
    // Добавляем аватар пользователя
    const userInfo = document.createElement('div');
    userInfo.style.display = 'flex';
    userInfo.style.alignItems = 'center';
    userInfo.style.gap = '12px';
    
    const avatar = document.createElement('div');
    avatar.style.width = '48px';
    avatar.style.height = '48px';
    avatar.style.borderRadius = '50%';
    avatar.style.background = u.avatarDataUrl 
      ? `center/cover no-repeat url('${u.avatarDataUrl}')` 
      : 'rgba(255, 255, 255, 0.1)';
    avatar.style.border = '2px solid rgba(255, 255, 255, 0.3)';
    avatar.style.flexShrink = '0';
    avatar.style.display = 'flex';
    avatar.style.alignItems = 'center';
    avatar.style.justifyContent = 'center';
    avatar.style.fontSize = '1.2rem';
    avatar.style.color = 'rgba(255, 255, 255, 0.6)';
    
    if (!u.avatarDataUrl) {
      const initials = (u.name || u.email || 'U').substring(0, 2).toUpperCase();
      avatar.textContent = initials;
    }
    
    const name = document.createElement('div');
    const roles = Array.isArray(u.roles) ? u.roles : [];
    const roleTags = [];
    if (u.isAdmin || roles.includes('admin') || String(u.role||'').toLowerCase()==='admin') roleTags.push('<span class="admin-tag" style="background:#722ed1;">Админ</span>');
    if (u.isManager || roles.includes('manager') || String(u.role||'').toLowerCase()==='manager') roleTags.push('<span class="admin-tag" style="background:#096dd9;">Менеджер</span>');
    if (u.isTrainer || roles.includes('trainer') || String(u.role||'').toLowerCase()==='trainer') roleTags.push('<span class="admin-tag" style="background:#13c2c2;">Тренер</span>');
    const roleTextParts = ['пользователь'];
    if (u.isTrainer || roles.includes('trainer') || String(u.role||'').toLowerCase()==='trainer') roleTextParts.push('тренер');
    if (u.isManager || roles.includes('manager') || String(u.role||'').toLowerCase()==='manager') roleTextParts.push('менеджер');
    if (u.isAdmin || roles.includes('admin') || String(u.role||'').toLowerCase()==='admin') roleTextParts.push('админ');
    name.innerHTML = `<strong>${u.name || u.email}</strong> <span class="admin-meta">${u.email}</span> ${roleTags.join(' ')}<div class="admin-meta">Роль: ${roleTextParts.join(', ')}</div>`;
    
    userInfo.appendChild(avatar);
    userInfo.appendChild(name);
    const actions = document.createElement('div');
    actions.className = 'admin-actions';
    // Кнопки ролей
    const roleButtons = document.createElement('div');
    roleButtons.style.display = 'flex';
    roleButtons.style.gap = '8px';
    const meUser = getCurrentUser();
    const meRoles = (meUser && Array.isArray(meUser.roles)) ? meUser.roles : [];
    const meIsAdmin = !!(meUser && (meUser.isAdmin || meRoles.includes('admin') || String(meUser.role||'').toLowerCase()==='admin'));
    const isSelf = !!(meUser && meUser.id === u.id);
    // Админ
    const adminBtn = document.createElement('button');
    adminBtn.className = 'profile-btn';
    adminBtn.textContent = (u.isAdmin || roles.includes('admin') || String(u.role||'').toLowerCase()==='admin') ? 'Снять админа' : 'Выдать админа';
    adminBtn.disabled = !meIsAdmin;
    // Запрет снять админа с защищённой почты
    const isProtectedAdminEmail = String(u.email || '').toLowerCase() === 'purepulse676@gmail.com';
    if (isProtectedAdminEmail) {
      adminBtn.disabled = true;
      adminBtn.textContent = 'Админ (защищено)';
      adminBtn.title = 'Этого админа нельзя понизить';
    } else {
      adminBtn.addEventListener('click', function(){ toggleUserRole(u.id, 'admin', !(u.isAdmin || roles.includes('admin') || String(u.role||'').toLowerCase()==='admin')); });
    }
    // Менеджер
    const managerBtn = document.createElement('button');
    managerBtn.className = 'profile-btn';
    managerBtn.textContent = (u.isManager || roles.includes('manager') || String(u.role||'').toLowerCase()==='manager') ? 'Снять менеджера' : 'Сделать менеджером';
    managerBtn.disabled = !meIsAdmin;
    managerBtn.addEventListener('click', function(){ toggleUserRole(u.id, 'manager', !(u.isManager || roles.includes('manager'))); });
    // Тренер
    const trainerBtn = document.createElement('button');
    trainerBtn.className = 'profile-btn';
    trainerBtn.textContent = (u.isTrainer || roles.includes('trainer')) ? 'Снять тренера' : 'Выдать роль тренера';
    trainerBtn.disabled = !meIsAdmin;
    trainerBtn.addEventListener('click', function(){ toggleUserRole(u.id, 'trainer', !(u.isTrainer || roles.includes('trainer'))); });
    roleButtons.appendChild(adminBtn);
    if (!(isSelf && meIsAdmin)) {
      roleButtons.appendChild(managerBtn);
      roleButtons.appendChild(trainerBtn);
    }
    const confirmWrap = document.createElement('label');
    confirmWrap.className = 'admin-confirm-wrap';
    const confirmCb = document.createElement('input');
    confirmCb.type = 'checkbox';
    confirmCb.className = 'admin-confirm-cb';
    const confirmText = document.createElement('span');
    confirmText.textContent = ' Подтверждаю удаление';
    confirmWrap.appendChild(confirmCb);
    confirmWrap.appendChild(confirmText);
    const delUserBtn = document.createElement('button');
    delUserBtn.className = 'admin-del-user';
    delUserBtn.textContent = 'Удалить пользователя';
    // Скрыть удаление для аккаунта с админ-почтой; также нельзя удалить себя
    const isAdminEmail = String(u.email || '').toLowerCase() === 'purepulse676@gmail.com';
    if ((me && me.id === u.id) || isAdminEmail) {
      delUserBtn.setAttribute('disabled', 'true');
      delUserBtn.style.opacity = '0.6';
      delUserBtn.title = isAdminEmail ? 'Удаление учётной записи администратора запрещено' : 'Нельзя удалить собственную учётную запись';
      confirmCb.setAttribute('disabled', 'true');
    } else {
      delUserBtn.setAttribute('disabled', 'true');
      confirmCb.addEventListener('change', function() {
        if (this.checked) delUserBtn.removeAttribute('disabled'); else delUserBtn.setAttribute('disabled', 'true');
      });
      delUserBtn.addEventListener('click', function() { if (!confirmCb.checked) return; adminDeleteUser(u.id); });
    }
    actions.appendChild(roleButtons);
    actions.appendChild(confirmWrap);
    actions.appendChild(delUserBtn);
    head.appendChild(userInfo);
    head.appendChild(actions);
    const plansWrap = document.createElement('div');
    plansWrap.className = 'admin-plans';
    const plans = Array.isArray(u.plans) ? u.plans : [];
    if (!plans.length) {
      const tag = document.createElement('span');
      tag.className = 'admin-tag';
      tag.textContent = 'Абонементов нет';
      plansWrap.appendChild(tag);
    } else {
      plans.forEach((p, idx) => {
        const tag = document.createElement('span');
        tag.className = 'admin-tag';
        tag.textContent = `${p.title}`;
        const del = document.createElement('button');
        del.className = 'admin-del-plan';
        del.textContent = '×';
        del.style.marginLeft = '6px';
        del.addEventListener('click', function() { adminDeletePlan(u.id, p); });
        const wrap = document.createElement('span');
        wrap.appendChild(tag);
        wrap.appendChild(del);
        plansWrap.appendChild(wrap);
      });
    }
    item.appendChild(head);
    item.appendChild(plansWrap);
    host.appendChild(item);
  });
}

function renderAdminBookings() {
  const host = document.getElementById('adminBookingsList');
  if (!host) return;
  host.innerHTML = '';
  const users = readUsers();
  // Сбор всех записей с привязкой к пользователю
  const items = [];
  users.forEach((u) => {
    const list = Array.isArray(u.bookings) ? u.bookings : [];
    list.forEach((b) => {
      items.push({
        userId: u.id,
        userName: u.name || u.email || 'Пользователь',
        booking: b
      });
    });
  });
  // Сортировка по дате
  items.sort((a, b) => new Date(a.booking.date) - new Date(b.booking.date));
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'bookings-empty';
    empty.textContent = 'Записей нет';
    host.appendChild(empty);
    return;
  }
  items.forEach(({ userId, userName, booking }) => {
    const row = document.createElement('div');
    row.className = 'booking-item admin';
    const title = document.createElement('div');
    title.className = 'booking-title';
    const gymText = booking.gym ? ` · ${formatGymAdmin(booking.gym)}` : '';
    title.textContent = `${booking.trainer || 'Тренировка'}${gymText}`;
    const meta = document.createElement('div');
    meta.className = 'booking-meta';
    meta.textContent = `${booking.date || ''} ${booking.time || ''} — ${userName}`;
    const actions = document.createElement('div');
    actions.className = 'booking-actions';
    const status = document.createElement('span');
    status.className = 'admin-tag';
    status.textContent = mapStatus(booking.status);
    const btnPlanned = document.createElement('button');
    btnPlanned.className = 'booking-planned-btn';
    btnPlanned.textContent = 'Запланирована';
    const btnDone = document.createElement('button');
    btnDone.className = 'booking-done-btn';
    btnDone.textContent = 'Завершена';
    const btnCancel = document.createElement('button');
    btnCancel.className = 'booking-cancel-admin-btn';
    btnCancel.textContent = 'Отменена';
    const confirmWrap = document.createElement('label');
    confirmWrap.className = 'booking-confirm-wrap';
    const confirmCb = document.createElement('input');
    confirmCb.type = 'checkbox';
    confirmCb.className = 'booking-confirm-cb';
    const confirmText = document.createElement('span');
    confirmText.textContent = ' Подтверждаю удаление';
    confirmWrap.appendChild(confirmCb);
    confirmWrap.appendChild(confirmText);
    const btnDel = document.createElement('button');
    btnDel.className = 'booking-delete-admin-btn';
    btnDel.textContent = 'Удалить';
    btnDel.setAttribute('disabled', 'true');
    confirmCb.addEventListener('change', function() {
      if (this.checked) btnDel.removeAttribute('disabled'); else btnDel.setAttribute('disabled', 'true');
    });
    btnPlanned.addEventListener('click', function() { adminUpdateBookingStatus(userId, booking.id, 'planned'); });
    btnDone.addEventListener('click', function() { adminUpdateBookingStatus(userId, booking.id, 'done'); });
    btnCancel.addEventListener('click', function() { adminUpdateBookingStatus(userId, booking.id, 'cancelled'); });
    btnDel.addEventListener('click', function() { if (!confirmCb.checked) return; adminDeleteBooking(userId, booking); });
    actions.appendChild(status);
    actions.appendChild(btnPlanned);
    actions.appendChild(btnDone);
    actions.appendChild(btnCancel);
    actions.appendChild(confirmWrap);
    actions.appendChild(btnDel);
    row.appendChild(title);
    row.appendChild(actions);
    row.appendChild(meta);
    host.appendChild(row);
  });
}

function adminUpdateBookingStatus(userId, bookingId, next) {
  const users = readUsers();
  const uidx = users.findIndex(u => u.id === userId);
  if (uidx === -1) return;
  const list = Array.isArray(users[uidx].bookings) ? users[uidx].bookings : [];
  const bidx = list.findIndex(b => b.id === bookingId);
  if (bidx === -1) return;
  list[bidx].status = next;
  users[uidx].bookings = list;
  writeUsers(users);
  // Если это текущий пользователь — синхронизируем локалку
  const me = getCurrentUser();
  if (me && me.id === userId) {
    me.bookings = list;
    setCurrentUser(me);
  }
  // Обновим статус и в Supabase, если есть supabaseId у брони
  try {
    const b = list[bidx];
    const supabaseId = b && b.supabaseId;
    if (window.supabase) {
      if (supabaseId) {
        updateBookingStatusInSupabase({ id: supabaseId, next, trainer: b.trainer, date: b.date, time: b.time }).then(() => {});
      } else {
        // Фолбэк: попытка найти запись по trainer_name и starts_at
        updateBookingStatusInSupabase({ id: null, next, trainer: b.trainer, date: b.date, time: b.time }).then(() => {});
      }
    }
  } catch {}
  try { showToast('Статус обновлён'); } catch {}
  renderAdminBookings();
}

function formatGymAdmin(code) {
  switch (code) {
    case 'nemiga': return 'Немига Бизнес-центр';
    case 'prityckogo': return 'Притыцкого';
    default: return 'Зал';
  }
}

function mapStatus(s) {
  switch (s) {
    case 'done': return 'Завершена';
    case 'cancelled': return 'Отменена';
    default: return 'Запланирована';
  }
}

async function updateBookingStatusInSupabase({ id, next, trainer, date, time }) {
  try {
    if (!window.supabase) return;
    let error;
    const statusMap = { planned: 'scheduled', done: 'completed', cancelled: 'cancelled' };
    const dbStatus = statusMap[next] || next;
    if (id) {
      ({ error } = await supabase.from('bookings').update({ status: dbStatus }).eq('id', id));
      if (error) throw error;
    } else {
      // искать по trainer_name + starts_at
      const iso = new Date(`${date}T${time}:00`).toISOString();
      ({ error } = await supabase.from('bookings').update({ status: dbStatus }).eq('trainer_name', trainer).eq('starts_at', iso));
      if (error) throw error;
    }
    console.log('[supabase] booking status updated');
  } catch (e) {
    console.warn('[supabase] update booking status failed', e);
  }
}

function adminDeleteBooking(userId, booking) {
  let users = readUsers();
  const uidx = users.findIndex(u => u.id === userId);
  if (uidx === -1) return;
  const list = Array.isArray(users[uidx].bookings) ? users[uidx].bookings : [];
  const bidx = list.findIndex(b => b.id === booking.id);
  if (bidx === -1) return;
  const removed = list.splice(bidx, 1);
  users[uidx].bookings = list;
  writeUsers(users);
  // если это текущий пользователь — синхронизируем локалку
  const me = getCurrentUser();
  if (me && me.id === userId) {
    me.bookings = list;
    setCurrentUser(me);
  }
  // Удалить из Supabase
  try {
    if (window.supabase) {
      const supabaseId = booking && booking.supabaseId;
      if (supabaseId) {
        deleteBookingFromSupabase({ id: supabaseId }).then(() => {});
      } else {
        const iso = new Date(`${booking.date}T${booking.time}:00`).toISOString();
        deleteBookingFromSupabase({ id: null, trainer: booking.trainer, iso }).then(() => {});
      }
    }
  } catch {}
  try { showToast('Запись удалена'); } catch {}
  renderAdminBookings();
}

async function deleteBookingFromSupabase({ id, trainer, iso }) {
  try {
    if (!window.supabase) return;
    let error;
    if (id) {
      ({ error } = await supabase.from('bookings').delete().eq('id', id));
      if (error) throw error;
    } else if (trainer && iso) {
      ({ error } = await supabase.from('bookings').delete().eq('trainer_name', trainer).eq('starts_at', iso));
      if (error) throw error;
    }
    console.log('[supabase] booking deleted');
  } catch (e) {
    console.warn('[supabase] delete booking failed', e);
  }
}

function adminDeletePlan(userId, plan) {
  const users = readUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return;
  const arr = Array.isArray(users[idx].plans) ? users[idx].plans : [];
  const pidx = arr.findIndex(pl => pl.title === plan.title && pl.purchasedAt === plan.purchasedAt);
  if (pidx !== -1) arr.splice(pidx, 1);
  users[idx].plans = arr;
  writeUsers(users);
  // если это текущий пользователь — синхронизируем
  const me = getCurrentUser();
  if (me && me.id === userId) {
    me.plans = arr;
    setCurrentUser(me);
    try { renderUserPlans(); } catch {}
  }
  showToast('Абонемент удалён');
  renderAdminUsers();
}

function adminDeleteUser(userId) {
  let users = readUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return;
  const me = getCurrentUser();
  if (me && me.id === userId) { showToast('Нельзя удалить свою учётную запись'); return; }
  const isAdminEmail = String(users[idx].email || '').toLowerCase() === 'purepulse676@gmail.com';
  if (isAdminEmail) { showToast('Нельзя удалить учётную запись администратора'); return; }
  const removed = users.splice(idx, 1);
  writeUsers(users);
  const me2 = getCurrentUser();
  // если удалили текущего пользователя (на всякий случай)
  if (me2 && me2.id === userId) { localStorage.removeItem('currentUser'); try { updateAuthLinkUI(); } catch {} }
  showToast('Пользователь удалён');
  renderAdminUsers();
}

// ===== Роли пользователей =====
function toggleUserRole(userId, role, enable) {
  const users = readUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return;
  const u = users[idx];
  let roles = Array.isArray(u.roles) ? u.roles.slice() : [];
  if (enable) {
    if (!roles.includes(role)) roles.push(role);
  } else {
    roles = roles.filter(r => r !== role);
  }
  // Удаляем дубли
  roles = roles.filter((r, i) => roles.indexOf(r) === i);
  u.roles = roles;
  u.isAdmin = roles.includes('admin');
  u.isManager = roles.includes('manager');
  u.isTrainer = roles.includes('trainer');
  if (u.isAdmin) {
    u.role = 'admin';
  } else if (u.isManager) {
    u.role = 'manager';
  } else if (u.isTrainer) {
    u.role = 'trainer';
  } else {
    u.role = 'user';
  }
  users[idx] = u;
  writeUsers(users);
  // Если меняем текущего пользователя — обновим currentUser
  const me = getCurrentUser();
  if (me && me.id === u.id) {
    me.roles = u.roles;
    me.isAdmin = u.isAdmin;
    me.isManager = u.isManager;
    me.isTrainer = u.isTrainer;
    me.role = u.role || 'user';
    setCurrentUser(me);
  }
  // Синхронизировать роль в Supabase (если доступен и есть supabaseId)
  try {
    if (window.supabase) {
      (async () => {
        // гарантируем наличие supabaseId (ищем запись по email)
        let supaId = u.supabaseId;
        if (!supaId) {
          const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('email', u.email)
            .maybeSingle();
          if (!error && data && data.id) {
            supaId = data.id;
            u.supabaseId = supaId;
            users[idx] = u;
            writeUsers(users);
          }
        }
        if (supaId) {
          const nextRole = u.isAdmin ? 'admin' : (u.isManager ? 'manager' : (u.isTrainer ? 'trainer' : 'user'));
          const { error } = await supabase.rpc('set_user_role_by_id', { p_user_id: supaId, p_role: nextRole });
          if (error) {
            console.warn('[supabase] update role failed', error);
            try { showToast('Ошибка записи роли в БД (проверьте CHECK роли)'); } catch {}
          }
        }
      })();
    }
  } catch (e) { console.warn('[supabase] role sync exception', e); }
  showToast('Роль обновлена');
  renderAdminUsers();
  try { toggleAdminUI(); } catch {}
}

// ===== Управление заявками на тренера =====
document.addEventListener('DOMContentLoaded', function() {
  const refreshBtn = document.getElementById('refreshApplicationsBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      renderAdminApplications();
    });
  }

  // Обработчики для управления тренерами
  const addTrainerBtn = document.getElementById('addTrainerBtn');
  if (addTrainerBtn) {
    addTrainerBtn.addEventListener('click', function() {
      openTrainerModal();
    });
  }

  const refreshTrainersBtn = document.getElementById('refreshTrainersBtn');
  if (refreshTrainersBtn) {
    refreshTrainersBtn.addEventListener('click', function() {
      renderAdminTrainers();
    });
  }

  // Обработчики для управления абонементами
  const addSubscriptionBtn = document.getElementById('addSubscriptionBtn');
  if (addSubscriptionBtn) {
    addSubscriptionBtn.addEventListener('click', function() {
      openSubscriptionModal();
    });
  }

  const refreshSubscriptionsBtn = document.getElementById('refreshSubscriptionsBtn');
  if (refreshSubscriptionsBtn) {
    refreshSubscriptionsBtn.addEventListener('click', function() {
      renderAdminSubscriptions();
    });
  }
  
  const clearSubscriptionsBtn = document.getElementById('clearSubscriptionsBtn');
  if (clearSubscriptionsBtn) {
    clearSubscriptionsBtn.addEventListener('click', function() {
      openClearSubscriptionsCaptchaModal();
    });
  }
  
  // Кнопка добавления тестового абонемента удалена

  // Инициализация модального окна тренера
  initTrainerModal();
  
  // Инициализация модального окна абонемента
  initSubscriptionModal();
  
  // Загрузка тренеров из Supabase при инициализации
  loadTrainersFromSupabase().catch((error) => {
    console.warn('[admin.js] Failed to load trainers from Supabase:', error);
  });
  
  // Загрузка абонементов при инициализации
  loadSubscriptionsFromSupabase();
  
  // НЕ добавляем тестовые данные автоматически
  // Раскомментируйте код ниже, если хотите восстановить автоматическое добавление:
  /*
  setTimeout(() => {
    const subscriptions = getSubscriptions();
    if (subscriptions.length === 0) {
      console.log('[admin.js] No subscriptions found, adding test data');
      addTestSubscription();
    }
  }, 2000);
  */
});

// ===== Капча для удаления всех абонементов =====
let clearSubscriptionsCaptchaCode = '';

document.addEventListener('DOMContentLoaded', function() {
  const clearModal = document.getElementById('clearSubscriptionsCaptchaModal');
  const img = document.getElementById('clearSubscriptionsCaptchaImage');
  const refresh = document.getElementById('clearSubscriptionsCaptchaRefresh');
  const input = document.getElementById('clearSubscriptionsCaptchaInput');
  const error = document.getElementById('clearSubscriptionsCaptchaError');
  const submit = document.getElementById('clearSubscriptionsCaptchaSubmit');
  const closeBtn = document.querySelector('.clear-subscriptions-captcha-close');

  if (refresh) refresh.addEventListener('click', generateClearSubscriptionsCaptcha);
  if (submit) submit.addEventListener('click', submitClearSubscriptions);
  if (closeBtn) closeBtn.addEventListener('click', closeClearSubscriptionsCaptchaModal);
  if (input) {
    input.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9]/g, '');
      if (error) error.textContent = '';
    });
  }
  if (clearModal) {
    clearModal.addEventListener('click', function(e) {
      if (e.target === clearModal) closeClearSubscriptionsCaptchaModal();
    });
  }
});

function openClearSubscriptionsCaptchaModal() {
  const modal = document.getElementById('clearSubscriptionsCaptchaModal');
  if (!modal) return;
  generateClearSubscriptionsCaptcha();
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    const input = document.getElementById('clearSubscriptionsCaptchaInput');
    if (input) input.focus();
  }, 100);
}

function closeClearSubscriptionsCaptchaModal() {
  const modal = document.getElementById('clearSubscriptionsCaptchaModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.style.display = 'none';
  document.body.style.overflow = '';
  const input = document.getElementById('clearSubscriptionsCaptchaInput');
  const error = document.getElementById('clearSubscriptionsCaptchaError');
  if (input) input.value = '';
  if (error) error.textContent = '';
}

function generateClearSubscriptionsCaptcha() {
  clearSubscriptionsCaptchaCode = Math.floor(100000 + Math.random() * 900000).toString();
  const img = document.getElementById('clearSubscriptionsCaptchaImage');
  if (img) img.textContent = clearSubscriptionsCaptchaCode;
}

function submitClearSubscriptions() {
  const input = document.getElementById('clearSubscriptionsCaptchaInput');
  const error = document.getElementById('clearSubscriptionsCaptchaError');
  const value = input ? input.value.trim() : '';
  if (!value) { if (error) error.textContent = 'Введите код с картинки'; return; }
  if (value !== clearSubscriptionsCaptchaCode) {
    if (error) error.textContent = 'Неверный код. Попробуйте ещё раз.';
    generateClearSubscriptionsCaptcha();
    if (input) input.value = '';
    return;
  }
  // Код верный — удаляем все абонементы
  localStorage.removeItem('subscriptions');
  try { showToast('Все абонементы удалены'); } catch {}
  try { renderAdminSubscriptions(); } catch {}
  try { if (typeof updateAbonementsSection === 'function') updateAbonementsSection(); } catch {}
  closeClearSubscriptionsCaptchaModal();
}

// Глобальная функция для очистки абонементов из localStorage
window.clearSubscriptions = function() {
  localStorage.removeItem('subscriptions');
  location.reload();
};

function renderAdminApplications() {
  const host = document.getElementById('adminApplicationsList');
  if (!host) return;
  
  try {
    const applications = JSON.parse(localStorage.getItem('trainerApplications') || '{}');
    const allApplications = [];
    
    // Собираем все заявки от всех пользователей
    Object.keys(applications).forEach(userId => {
      const userApplications = applications[userId] || [];
      userApplications.forEach(app => {
        allApplications.push({
          ...app,
          userId: userId
        });
      });
    });
    
    // Сортируем по дате (новые сверху)
    allApplications.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    host.innerHTML = '';
    
    if (allApplications.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'bookings-empty';
      empty.textContent = 'Заявок на тренера нет';
      host.appendChild(empty);
      return;
    }
    
    allApplications.forEach(app => {
      const item = document.createElement('div');
      item.className = 'application-admin-item';
      
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
      
      item.innerHTML = `
        <div class="application-admin-header">
          <div class="application-admin-info">
            <h4>${app.data.name || 'Не указано'}</h4>
            <div class="application-admin-meta">
              <span>ID: ${app.id}</span>
              <span>Дата: ${date}</span>
              <span>Пользователь ID: ${app.userId}</span>
            </div>
          </div>
          <div class="application-admin-status ${status}">${statusText}</div>
        </div>
        
        <div class="application-admin-details">
          <h5>Контактная информация:</h5>
          <p><strong>Телефон:</strong> ${app.data.phone || 'Не указан'}</p>
          <p><strong>Email:</strong> ${app.data.email || 'Не указан'}</p>
          <p><strong>Зал:</strong> ${getGymName(app.data.gym)}</p>
          <p><strong>Стаж работы:</strong> ${app.data.experience || 'Не указан'} лет</p>
          <p><strong>О себе:</strong> ${app.data.about || 'Не указано'}</p>
        </div>
        
        <div class="application-admin-actions">
          <button class="application-admin-btn approve ${status === 'approved' ? 'current-status' : ''}" onclick="approveApplication('${app.id}', '${app.userId}')">
            ✓ Принять
          </button>
          <button class="application-admin-btn reject ${status === 'rejected' ? 'current-status' : ''}" onclick="rejectApplication('${app.id}', '${app.userId}')">
            ✗ Отклонить
          </button>
          <button class="application-admin-btn delete" onclick="deleteApplication('${app.id}', '${app.userId}')">
            🗑 Удалить
          </button>
        </div>
      `;
      
      host.appendChild(item);
    });
    
  } catch (error) {
    console.error('Ошибка при загрузке заявок:', error);
    host.innerHTML = '<div class="bookings-empty">Ошибка при загрузке заявок</div>';
  }
}

function getGymName(gymCode) {
  switch (gymCode) {
    case 'nemiga': return 'Немига Бизнес-центр';
    case 'prityckogo': return 'Притыцкого';
    default: return gymCode || 'Не указан';
  }
}

function approveApplication(applicationId, userId) {
  // Получаем текущий статус заявки
  const applications = JSON.parse(localStorage.getItem('trainerApplications') || '{}');
  const userApplications = applications[userId] || [];
  const currentApp = userApplications.find(app => app.id == applicationId);
  const currentStatus = currentApp ? currentApp.status : 'pending';
  
  let confirmMessage = 'Вы уверены, что хотите принять эту заявку?';
  if (currentStatus === 'approved') {
    confirmMessage = 'Заявка уже принята. Вы уверены, что хотите подтвердить статус "Принят"?';
  } else if (currentStatus === 'rejected') {
    confirmMessage = 'Заявка была отклонена. Вы уверены, что хотите изменить статус на "Принят"?';
  }
  
  if (!confirm(confirmMessage)) return;
  
  try {
    const applications = JSON.parse(localStorage.getItem('trainerApplications') || '{}');
    const userApplications = applications[userId] || [];
    
    const appIndex = userApplications.findIndex(app => app.id == applicationId);
    if (appIndex !== -1) {
      userApplications[appIndex].status = 'approved';
      userApplications[appIndex].reviewedAt = new Date().toISOString();
      applications[userId] = userApplications;
      localStorage.setItem('trainerApplications', JSON.stringify(applications));
      
      let successMessage = 'Заявка принята';
      if (currentStatus === 'approved') {
        successMessage = 'Статус "Принят" подтвержден';
      } else if (currentStatus === 'rejected') {
        successMessage = 'Статус изменен на "Принят"';
      }
      showToast(successMessage);
      renderAdminApplications();
      
      // Синхронизация с Supabase
      try {
        syncApplicationStatusWithSupabase(applicationId, 'approved');
      } catch (error) {
        console.warn('Ошибка синхронизации с Supabase:', error);
      }
    }
  } catch (error) {
    console.error('Ошибка при принятии заявки:', error);
    showToast('Ошибка при принятии заявки');
  }
}

function rejectApplication(applicationId, userId) {
  // Получаем текущий статус заявки
  const applications = JSON.parse(localStorage.getItem('trainerApplications') || '{}');
  const userApplications = applications[userId] || [];
  const currentApp = userApplications.find(app => app.id == applicationId);
  const currentStatus = currentApp ? currentApp.status : 'pending';
  
  let confirmMessage = 'Вы уверены, что хотите отклонить эту заявку?';
  if (currentStatus === 'rejected') {
    confirmMessage = 'Заявка уже отклонена. Вы уверены, что хотите подтвердить статус "Отклонен"?';
  } else if (currentStatus === 'approved') {
    confirmMessage = 'Заявка была принята. Вы уверены, что хотите изменить статус на "Отклонен"?';
  }
  
  if (!confirm(confirmMessage)) return;
  
  try {
    const applications = JSON.parse(localStorage.getItem('trainerApplications') || '{}');
    const userApplications = applications[userId] || [];
    
    const appIndex = userApplications.findIndex(app => app.id == applicationId);
    if (appIndex !== -1) {
      userApplications[appIndex].status = 'rejected';
      userApplications[appIndex].reviewedAt = new Date().toISOString();
      applications[userId] = userApplications;
      localStorage.setItem('trainerApplications', JSON.stringify(applications));
      
      let successMessage = 'Заявка отклонена';
      if (currentStatus === 'rejected') {
        successMessage = 'Статус "Отклонен" подтвержден';
      } else if (currentStatus === 'approved') {
        successMessage = 'Статус изменен на "Отклонен"';
      }
      showToast(successMessage);
      renderAdminApplications();
      
      // Синхронизация с Supabase
      try {
        syncApplicationStatusWithSupabase(applicationId, 'rejected');
      } catch (error) {
        console.warn('Ошибка синхронизации с Supabase:', error);
      }
    }
  } catch (error) {
    console.error('Ошибка при отклонении заявки:', error);
    showToast('Ошибка при отклонении заявки');
  }
}

function deleteApplication(applicationId, userId) {
  if (!confirm('Вы уверены, что хотите удалить эту заявку? Это действие нельзя отменить.')) return;
  
  try {
    const applications = JSON.parse(localStorage.getItem('trainerApplications') || '{}');
    const userApplications = applications[userId] || [];
    
    const appIndex = userApplications.findIndex(app => app.id == applicationId);
    if (appIndex !== -1) {
      userApplications.splice(appIndex, 1);
      applications[userId] = userApplications;
      localStorage.setItem('trainerApplications', JSON.stringify(applications));
      
      showToast('Заявка удалена');
      renderAdminApplications();
      
      // Синхронизация с Supabase
      try {
        deleteApplicationFromSupabase(applicationId);
      } catch (error) {
        console.warn('Ошибка синхронизации с Supabase:', error);
      }
    }
  } catch (error) {
    console.error('Ошибка при удалении заявки:', error);
    showToast('Ошибка при удалении заявки');
  }
}

async function syncApplicationStatusWithSupabase(applicationId, status) {
  if (!window.supabase) return;
  
  try {
    const { error } = await supabase
      .from('trainer_applications')
      .update({ 
        status: status,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', applicationId);
    
    if (error) throw error;
    console.log('[supabase] application status updated');
  } catch (error) {
    console.warn('[supabase] sync application status failed', error);
  }
}

async function deleteApplicationFromSupabase(applicationId) {
  if (!window.supabase) return;
  
  try {
    const { error } = await supabase
      .from('trainer_applications')
      .delete()
      .eq('id', applicationId);
    
    if (error) throw error;
    console.log('[supabase] application deleted');
  } catch (error) {
    console.warn('[supabase] delete application failed', error);
  }
}

// ===== Управление тренерами =====
let trainerModalEl;
let trainerFormEl;
let trainerNameEl;
let trainerDescriptionEl;
let trainerPhotoEl;
let trainerPhotoPreviewEl;
let trainerGymEl;
let trainerEmailEl;
let trainerSpecializationEl;
let trainerExperienceEl;
let trainerSubmitBtn;
let trainerCloseBtn;
let currentEditingTrainerId = null;

function initTrainerModal() {
  trainerModalEl = document.getElementById('trainerModal');
  if (!trainerModalEl) return;

  trainerFormEl = document.getElementById('trainerForm');
  trainerNameEl = document.getElementById('trainerName');
  trainerEmailEl = document.getElementById('trainerEmail');
  trainerDescriptionEl = document.getElementById('trainerDescription');
  trainerPhotoEl = document.getElementById('trainerPhoto');
  trainerPhotoPreviewEl = document.getElementById('trainerPhotoPreview');
  trainerGymEl = document.getElementById('trainerGym');
  trainerSpecializationEl = document.getElementById('trainerSpecialization');
  trainerExperienceEl = document.getElementById('trainerExperience');
  trainerSubmitBtn = document.getElementById('trainerSubmit');
  trainerCloseBtn = document.querySelector('.trainer-close');

  // Обработчики событий
  if (trainerCloseBtn) {
    trainerCloseBtn.addEventListener('click', closeTrainerModal);
  }

  if (trainerFormEl) {
    trainerFormEl.addEventListener('submit', function(e) {
      e.preventDefault();
      saveTrainer();
    });
  }

  if (trainerPhotoEl) {
    trainerPhotoEl.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          trainerPhotoPreviewEl.innerHTML = `<img src="${e.target.result}" alt="Превью фото">`;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Закрытие по клику на фон
  trainerModalEl.addEventListener('click', function(e) {
    if (e.target === trainerModalEl) {
      closeTrainerModal();
    }
  });
}

function openTrainerModal(trainerId = null) {
  if (!trainerModalEl) return;
  
  currentEditingTrainerId = trainerId;
  
  // Очистка формы
  trainerFormEl.reset();
  trainerPhotoPreviewEl.innerHTML = '';
  
  if (trainerId) {
    // Режим редактирования
    const trainer = getTrainerDataById(trainerId);
    if (trainer) {
      document.getElementById('trainerModalTitle').textContent = 'Редактировать тренера';
      trainerNameEl.value = trainer.name || '';
      if (trainerEmailEl) trainerEmailEl.value = trainer.email || '';
      trainerDescriptionEl.value = trainer.description || '';
      trainerGymEl.value = trainer.gym || 'nemiga';
      trainerSpecializationEl.value = trainer.specialization || '';
      trainerExperienceEl.value = trainer.experience || '';
      
      if (trainer.photo) {
        trainerPhotoPreviewEl.innerHTML = `<img src="${trainer.photo}" alt="Фото тренера">`;
      }
    }
  } else {
    // Режим добавления
    document.getElementById('trainerModalTitle').textContent = 'Добавить тренера';
    if (trainerEmailEl) trainerEmailEl.value = '';
  }
  
  trainerModalEl.classList.remove('hidden');
  trainerModalEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  // Фокус на первое поле
  setTimeout(() => {
    if (trainerNameEl) trainerNameEl.focus();
  }, 100);
}

function closeTrainerModal() {
  if (!trainerModalEl) return;
  
  trainerModalEl.classList.add('hidden');
  trainerModalEl.style.display = 'none';
  document.body.style.overflow = '';
  
  // Очистка формы
  trainerFormEl.reset();
  trainerPhotoPreviewEl.innerHTML = '';
  currentEditingTrainerId = null;
}

async function saveTrainer() {
  const name = trainerNameEl.value.trim();
  const email = trainerEmailEl ? trainerEmailEl.value.trim() : '';
  const description = trainerDescriptionEl.value.trim();
  const gym = trainerGymEl.value;
  const specialization = trainerSpecializationEl.value.trim();
  const experience = trainerExperienceEl.value;
  const photoFile = trainerPhotoEl.files[0];
  
  if (!name || !description) {
    showToast('Заполните обязательные поля: имя и описание');
    return;
  }
  const emailValidator = (window.isValidEmail ? window.isValidEmail : (val => /\S+@\S+\.\S+/.test(val)));
  if (!email || !emailValidator(email)) {
    showToast('Введите корректный email тренера');
    return;
  }
  
  if (isTrainerEmailTaken(email, currentEditingTrainerId)) {
    showToast('Тренер с таким email уже существует');
    return;
  }
  
  try {
    const trainers = getTrainers();
    const existingTrainer = currentEditingTrainerId ? getTrainerById(currentEditingTrainerId) : null;
    const trainerData = {
      // сохраняем исходный id при редактировании
      id: currentEditingTrainerId || Date.now(),
      name,
      email,
      description,
      gym,
      specialization,
      experience: experience ? parseInt(experience) : null,
      photo: null,
      // сохраняем создано-дату и supabaseId при редактировании
      createdAt: existingTrainer && existingTrainer.createdAt ? existingTrainer.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      supabaseId: existingTrainer && existingTrainer.supabaseId ? existingTrainer.supabaseId : null
    };
    
    // Обработка фото
    if (photoFile) {
      const reader = new FileReader();
      reader.onload = async function(e) {
        trainerData.photo = e.target.result;
        await saveTrainerData(trainerData);
      };
      reader.readAsDataURL(photoFile);
    } else if (currentEditingTrainerId) {
      // Сохраняем существующее фото при редактировании
      trainerData.photo = (existingTrainer && existingTrainer.photo) || null;
      await saveTrainerData(trainerData);
    } else {
      await saveTrainerData(trainerData);
    }
    
  } catch (error) {
    console.error('Ошибка при сохранении тренера:', error);
    showToast('Ошибка при сохранении тренера');
  }
}

async function saveTrainerData(trainerData) {
  const trainers = getTrainers();
  
  if (currentEditingTrainerId) {
    // Обновление существующего тренера
    const index = trainers.findIndex(t => String(t.id) === String(currentEditingTrainerId));
    
    if (index !== -1) {
      // Обновляем существующего тренера - НЕ ДОБАВЛЯЕМ НОВЫЙ!
      const existingTrainer = trainers[index];
      const preservedSupabaseId = existingTrainer.supabaseId || null;
      
      // Сохраняем все поля существующего тренера и обновляем только измененные
      trainers[index] = {
        ...existingTrainer,
        name: trainerData.name,
        email: trainerData.email,
        description: trainerData.description,
        gym: trainerData.gym,
        specialization: trainerData.specialization,
        experience: trainerData.experience,
        photo: trainerData.photo !== null ? trainerData.photo : existingTrainer.photo,
        updatedAt: trainerData.updatedAt,
        supabaseId: preservedSupabaseId
      };
    } else {
      if (String(currentEditingTrainerId).startsWith('original_')) {
        trainers.push(trainerData);
      } else {
        console.error('[saveTrainerData] Trainer not found for editing! ID:', currentEditingTrainerId);
        showToast('Ошибка: тренер не найден для редактирования');
        return;
      }
    }
  } else {
    // Добавление нового тренера
    trainers.push(trainerData);
  }
  
  localStorage.setItem('trainers', JSON.stringify(trainers));
  
  showToast(currentEditingTrainerId ? 'Тренер обновлен' : 'Тренер добавлен');
  closeTrainerModal();
  renderAdminTrainers();
  
  // Синхронизация с Supabase
  try {
    await syncTrainerWithSupabase(trainerData);
    // Обновляем секцию после успешной синхронизации с Supabase
    if (typeof updateTrainersSection === 'function') {
      updateTrainersSection();
    }
  } catch (error) {
    console.warn('Ошибка синхронизации с Supabase:', error);
    // Обновляем секцию даже при ошибке синхронизации
    if (typeof updateTrainersSection === 'function') {
      updateTrainersSection();
    }
  }
}

function renderAdminTrainers() {
  const host = document.getElementById('adminTrainersList');
  if (!host) return;
  
  try {
    const { mergedOriginals, createdTrainers } = mergeTrainersForDisplay();
    const allTrainers = [...mergedOriginals, ...createdTrainers];
    host.innerHTML = '';
    
    if (allTrainers.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'bookings-empty';
      empty.textContent = 'Тренеров нет';
      host.appendChild(empty);
      return;
    }
    
    allTrainers.forEach(trainer => {
      const item = document.createElement('div');
      item.className = 'trainer-admin-item';
      
      const gymName = getGymName(trainer.gym);
      
      // Для всех тренеров одинаковые кнопки (редактировать и удалить/скрыть)
      // Если тренер скрыт - показываем кнопку восстановления
      const isHidden = trainer.isOriginal && trainer.isHidden;
      const actionsHtml = isHidden ? `
        <div class="trainer-admin-actions">
          <button class="trainer-admin-btn edit" onclick="restoreOriginalTrainer('${trainer.id}')">
            👁 Показать на сайте
          </button>
        </div>
      ` : `
        <div class="trainer-admin-actions">
          <button class="trainer-admin-btn edit" onclick="${trainer.isOriginal ? "editOriginalTrainer('" + trainer.id + "')" : "editTrainer('" + trainer.id + "')"}">
            ✏ Редактировать
          </button>
          <button class="trainer-admin-btn delete" onclick="${trainer.isOriginal ? "deleteOriginalTrainer('" + trainer.id + "')" : "deleteTrainer('" + trainer.id + "')"}">
            🗑 ${trainer.isOriginal ? 'Скрыть с сайта' : 'Удалить'}
          </button>
        </div>
      `;
      
      const statusText = isHidden ? 
        '<span style="color: #faad14; font-size: 12px;">(Скрыт)</span>' : '';
      
      item.innerHTML = `
        <img class="trainer-admin-photo" src="${trainer.photo || 'images/default-trainer.jpg'}" alt="${trainer.name}">
        <div class="trainer-admin-info">
          <h4>${trainer.name} ${statusText}</h4>
          <div class="trainer-admin-details">
            <p><strong>Зал:</strong> ${gymName}</p>
            <p><strong>Специализация:</strong> ${trainer.specialization || 'Не указана'}</p>
            <p><strong>Опыт:</strong> ${trainer.experience ? trainer.experience + ' лет' : 'Не указан'}</p>
            <p><strong>Email:</strong> ${trainer.email || 'Не указан'}</p>
            <p><strong>Описание:</strong> ${trainer.description}</p>
          </div>
        </div>
        ${actionsHtml}
      `;
      
      host.appendChild(item);
    });
    
  } catch (error) {
    console.error('Ошибка при загрузке тренеров:', error);
    host.innerHTML = '<div class="bookings-empty">Ошибка при загрузке тренеров</div>';
  }
}

function getTrainers() {
  try {
    const raw = localStorage.getItem('trainers');
    console.log('[getTrainers] Raw localStorage value:', raw);
    const trainers = JSON.parse(raw || '[]');
    console.log('[getTrainers] Retrieved', trainers.length, 'trainers from localStorage:', trainers);
    return trainers;
  } catch (error) {
    console.error('[getTrainers] Ошибка при загрузке тренеров:', error);
    return [];
  }
}

function getTrainerById(id) {
  const trainers = getTrainers();
  return trainers.find(t => t.id == id);
}

function editTrainer(trainerId) {
  openTrainerModal(trainerId);
}

function editOriginalTrainer(trainerId) {
  // Редактирование оригинального тренера - открываем ту же модалку
  openTrainerModal(trainerId);
}

function deleteTrainer(trainerId) {
  if (!confirm('Вы уверены, что хотите удалить этого тренера? Это действие нельзя отменить.')) return;
  
  try {
    const trainers = getTrainers();
    
    // Находим тренера ДО удаления, чтобы сохранить supabaseId
    const trainerToDelete = trainers.find(t => t.id == trainerId);
    
    // Удаляем из localStorage
    const filteredTrainers = trainers.filter(t => t.id != trainerId);
    localStorage.setItem('trainers', JSON.stringify(filteredTrainers));
    
    showToast('Тренер удален');
    renderAdminTrainers();
    updateTrainersSection();
    
    // Синхронизация с Supabase - удаляем из БД
    try {
      if (trainerToDelete && trainerToDelete.supabaseId) {
        deleteTrainerFromSupabaseBySupabaseId(trainerToDelete.supabaseId);
      } else if (trainerId) {
        // Если нет supabaseId, пробуем удалить по локальному ID
        deleteTrainerFromSupabase(trainerId);
      }
    } catch (error) {
      console.warn('Ошибка синхронизации с Supabase:', error);
    }
    
  } catch (error) {
    console.error('Ошибка при удалении тренера:', error);
    showToast('Ошибка при удалении тренера');
  }
}

function deleteOriginalTrainer(trainerId) {
  if (!confirm('Вы уверены, что хотите скрыть этого тренера с сайта? Это действие можно отменить.')) return;
  
  try {
    // Получаем список скрытых оригинальных тренеров
    const hiddenTrainers = JSON.parse(localStorage.getItem('hiddenOriginalTrainers') || '[]');
    
    if (!hiddenTrainers.includes(trainerId)) {
      hiddenTrainers.push(trainerId);
      localStorage.setItem('hiddenOriginalTrainers', JSON.stringify(hiddenTrainers));
    }
    
    showToast('Тренер скрыт с сайта');
    renderAdminTrainers();
    updateTrainersSection();
    
  } catch (error) {
    console.error('Ошибка при скрытии тренера:', error);
    showToast('Ошибка при скрытии тренера');
  }
}

function restoreOriginalTrainer(trainerId) {
  if (!confirm('Вы уверены, что хотите показать этого тренера на сайте?')) return;
  
  try {
    // Получаем список скрытых оригинальных тренеров
    const hiddenTrainers = JSON.parse(localStorage.getItem('hiddenOriginalTrainers') || '[]');
    
    // Удаляем тренера из списка скрытых
    const filteredHidden = hiddenTrainers.filter(id => id !== trainerId);
    localStorage.setItem('hiddenOriginalTrainers', JSON.stringify(filteredHidden));
    
    showToast('Тренер показан на сайте');
    renderAdminTrainers();
    updateTrainersSection();
    
  } catch (error) {
    console.error('Ошибка при восстановлении тренера:', error);
    showToast('Ошибка при восстановлении тренера');
  }
}

function updateTrainersSection() {
  const trainersSection = document.getElementById('trainers-section');
  if (!trainersSection) return;
  
  const trainersContainer = trainersSection.querySelector('.trainers-container');
  if (!trainersContainer) return;
  
  const { mergedOriginals, createdTrainers } = mergeTrainersForDisplay();
  const visibleOriginals = mergedOriginals.filter(t => !t.isHidden);
  const allTrainers = [...visibleOriginals, ...createdTrainers];
  
  trainersContainer.innerHTML = '';
  
  let newTrainerIndex = 0;
  
  allTrainers.forEach((trainer) => {
    const card = document.createElement('div');
    card.className = 'trainer-card';
    if (trainer.gym) card.dataset.gym = trainer.gym;
    if (trainer.email) card.dataset.email = trainer.email;
    card.dataset.trainerId = trainer.id || '';
    
    // Добавляем класс для новых тренеров (не оригинальных)
    if (!trainer.id || !String(trainer.id).startsWith('original_')) {
      card.classList.add('new-trainer');
    }
    
    const emailMarkup = trainer.email
      ? `<p class="trainer-email"><a href="mailto:${trainer.email}">${trainer.email}</a></p>`
      : '';

    card.innerHTML = `
      <img src="${trainer.photo || 'images/default-trainer.jpg'}" alt="${trainer.name}">
      <h3>${trainer.name}</h3>
      <p>${trainer.description}</p>
      ${emailMarkup}
    `;
    
    trainersContainer.appendChild(card);
    
    // Анимация появления только для новых тренеров
    if (!trainer.id || !String(trainer.id).startsWith('original_')) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      
      setTimeout(() => {
        card.classList.add('animate-in');
      }, newTrainerIndex * 200);
      newTrainerIndex++;
    }
  });
  
  // Добавляем кнопки "Оставить отзыв" к новым карточкам
  setTimeout(() => {
    if (typeof addReviewButtons === 'function') {
      addReviewButtons();
    }
  }, 100);
}

// Делаем функцию доступной глобально для вызова из других скриптов
window.updateTrainersSection = updateTrainersSection;

async function syncTrainerWithSupabase(trainerData) {
  if (!window.supabase) return;
  
  try {
    const trainerRecord = {
      name: trainerData.name,
      email: trainerData.email,
      description: trainerData.description,
      gym: trainerData.gym,
      specialization: trainerData.specialization,
      experience: trainerData.experience,
      photo_url: trainerData.photo,
      created_at: trainerData.createdAt,
      updated_at: trainerData.updatedAt
    };
    
    let targetSupabaseId = trainerData.supabaseId || null;
    
    if (!targetSupabaseId && trainerData.email) {
      const { data: existingByEmail, error: lookupError } = await supabase
        .from('trainers')
        .select('id')
        .eq('email', trainerData.email)
        .maybeSingle();
      
      if (lookupError && lookupError.code !== 'PGRST116') {
        console.warn('[syncTrainerWithSupabase] Lookup by email failed', lookupError);
      }
      
      if (existingByEmail && existingByEmail.id) {
        targetSupabaseId = existingByEmail.id;
      }
    }
    
    if (targetSupabaseId) {
      const { error } = await supabase
        .from('trainers')
        .update(trainerRecord)
        .eq('id', targetSupabaseId);
      
      if (error) throw error;
      trainerData.supabaseId = targetSupabaseId;
      persistTrainerSupabaseId(trainerData.id, targetSupabaseId);
    } else {
      const { data, error } = await supabase
        .from('trainers')
        .upsert([trainerRecord], { onConflict: 'email' })
        .select('id')
        .single();
      
      if (error) throw error;
      
      const supabaseId = data && data.id;
      if (supabaseId) {
        trainerData.supabaseId = supabaseId;
        persistTrainerSupabaseId(trainerData.id, supabaseId);
      }
    }
  } catch (error) {
    console.error('[syncTrainerWithSupabase] sync trainer failed', error);
  }
}

function persistTrainerSupabaseId(localTrainerId, supabaseId) {
  if (!localTrainerId || !supabaseId) return;
  try {
    const trainers = getTrainers();
    const idx = trainers.findIndex(t => String(t.id) === String(localTrainerId));
    if (idx !== -1) {
      trainers[idx].supabaseId = supabaseId;
      localStorage.setItem('trainers', JSON.stringify(trainers));
    }
  } catch (error) {
    console.warn('[syncTrainerWithSupabase] Failed to persist supabaseId locally', error);
  }
}

async function deleteTrainerFromSupabase(trainerId) {
  if (!window.supabase) return;
  
  try {
    // Получаем тренера из localStorage, чтобы найти supabaseId
    const trainer = getTrainerById(trainerId);
    if (!trainer || !trainer.supabaseId) {
      console.warn('No Supabase ID found for trainer:', trainerId);
      return;
    }
    
    const { error } = await supabase
      .from('trainers')
      .delete()
      .eq('id', trainer.supabaseId);
    
    if (error) throw error;
    console.log('[supabase] trainer deleted with ID:', trainer.supabaseId);
  } catch (error) {
    console.warn('[supabase] delete trainer failed', error);
  }
}

async function deleteTrainerFromSupabaseBySupabaseId(supabaseId) {
  if (!window.supabase || !supabaseId) return;
  
  try {
    const { error } = await supabase
      .from('trainers')
      .delete()
      .eq('id', supabaseId);
    
    if (error) throw error;
    console.log('[supabase] trainer deleted from Supabase with ID:', supabaseId);
  } catch (error) {
    console.warn('[supabase] delete trainer failed', error);
  }
}

async function loadTrainersFromSupabase() {
  if (!window.supabase) return;
  
  try {
    const { data, error } = await supabase
      .from('trainers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      // Конвертируем данные из Supabase в локальный формат
      const supabaseTrainers = data.map(item => ({
        id: item.id,
        supabaseId: item.id,
        name: item.name,
        email: item.email,
        description: item.description,
        gym: item.gym,
        specialization: item.specialization,
        experience: item.experience,
        photo: item.photo_url,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      
      // Получаем существующих тренеров из localStorage
      const existingTrainers = getTrainers();
      
      // Объединяем данные: начинаем с localStorage (все недавно добавленные тренеры)
      const mergedTrainers = [...existingTrainers];
      
      supabaseTrainers.forEach(supabaseTrainer => {
        // Ищем по supabaseId
        const existingIndex = mergedTrainers.findIndex(t => t.supabaseId === supabaseTrainer.supabaseId);
        if (existingIndex !== -1) {
          // Обновляем существующего тренера из Supabase
          mergedTrainers[existingIndex] = supabaseTrainer;
        } else {
          // Проверяем, нет ли тренера с таким же локальным ID (чтобы не дублировать)
          const existsByLocalId = mergedTrainers.findIndex(t => String(t.id) === String(supabaseTrainer.id));
          if (existsByLocalId === -1) {
            // Добавляем тренера из Supabase только если его нет
            mergedTrainers.push(supabaseTrainer);
          }
        }
      });
      
      // Сохраняем обновленный список
      localStorage.setItem('trainers', JSON.stringify(mergedTrainers));
      
      // Обновляем секцию тренеров на сайте
      if (typeof updateTrainersSection === 'function') {
        updateTrainersSection();
      }
    }
  } catch (error) {
    console.error('[supabase] load trainers failed', error);
  }
}

// Функция для добавления тестового абонемента
function addTestSubscription() {
  const testSubscription = {
    id: Date.now(),
    name: 'VIP Месячный',
    description: 'Полный доступ ко всем залам 24/7 с персональным тренером',
    price: 150.00,
    duration: 30,
    type: 'monthly',
    access: '24/7',
    gyms: ['nemiga', 'prityckogo'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    supabaseId: null
  };
  
  const subscriptions = getSubscriptions();
  subscriptions.push(testSubscription);
  localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
  
  console.log('[addTestSubscription] Test subscription added:', testSubscription);
  
  // Обновляем админ-панель
  renderAdminSubscriptions();
  
  // Обновляем секцию абонементов на сайте
  if (typeof updateAbonementsSection === 'function') {
    updateAbonementsSection();
  }
}

// ===== Управление абонементами =====
let subscriptionModalEl;
let subscriptionFormEl;
let subscriptionNameEl;
let subscriptionDescriptionEl;
let subscriptionPriceEl;
let subscriptionDurationEl;
let subscriptionTypeEl;
let subscriptionAccessEl;
let subscriptionGymNemigaEl;
let subscriptionGymPrityckogoEl;
let subscriptionActiveEl;
let subscriptionSubmitBtn;
let subscriptionCloseBtn;
let currentEditingSubscriptionId = null;

function initSubscriptionModal() {
  subscriptionModalEl = document.getElementById('subscriptionModal');
  if (!subscriptionModalEl) return;

  subscriptionFormEl = document.getElementById('subscriptionForm');
  subscriptionNameEl = document.getElementById('subscriptionName');
  subscriptionDescriptionEl = document.getElementById('subscriptionDescription');
  subscriptionPriceEl = document.getElementById('subscriptionPrice');
  subscriptionDurationEl = document.getElementById('subscriptionDuration');
  subscriptionTypeEl = document.getElementById('subscriptionType');
  subscriptionAccessEl = document.getElementById('subscriptionAccess');
  subscriptionGymNemigaEl = document.getElementById('subscriptionGymNemiga');
  subscriptionGymPrityckogoEl = document.getElementById('subscriptionGymPrityckogo');
  subscriptionActiveEl = document.getElementById('subscriptionActive');
  subscriptionSubmitBtn = document.getElementById('subscriptionSubmit');
  subscriptionCloseBtn = document.querySelector('.subscription-close');

  // Обработчики событий
  if (subscriptionCloseBtn) {
    subscriptionCloseBtn.addEventListener('click', closeSubscriptionModal);
  }

  if (subscriptionFormEl) {
    subscriptionFormEl.addEventListener('submit', function(e) {
      e.preventDefault();
      saveSubscription();
    });
  }

  // Закрытие по клику на фон
  subscriptionModalEl.addEventListener('click', function(e) {
    if (e.target === subscriptionModalEl) {
      closeSubscriptionModal();
    }
  });
}

function openSubscriptionModal(subscriptionId = null) {
  if (!subscriptionModalEl) return;
  
  currentEditingSubscriptionId = subscriptionId;
  
  // Очистка формы
  subscriptionFormEl.reset();
  
  if (subscriptionId) {
    // Режим редактирования
    const subscription = getSubscriptionById(subscriptionId);
    if (subscription) {
      document.getElementById('subscriptionModalTitle').textContent = 'Редактировать абонемент';
      subscriptionNameEl.value = subscription.name || '';
      subscriptionDescriptionEl.value = subscription.description || '';
      subscriptionPriceEl.value = subscription.price || '';
      subscriptionDurationEl.value = subscription.duration || '';
      subscriptionTypeEl.value = subscription.type || 'monthly';
      subscriptionAccessEl.value = subscription.access || '24/7';
      subscriptionActiveEl.value = subscription.active ? 'true' : 'false';
      
      // Устанавливаем чекбоксы залов
      if (subscription.gyms && subscription.gyms.includes('nemiga')) {
        subscriptionGymNemigaEl.checked = true;
      }
      if (subscription.gyms && subscription.gyms.includes('prityckogo')) {
        subscriptionGymPrityckogoEl.checked = true;
      }
    }
  } else {
    // Режим добавления
    document.getElementById('subscriptionModalTitle').textContent = 'Добавить абонемент';
  }
  
  subscriptionModalEl.classList.remove('hidden');
  subscriptionModalEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  // Фокус на первое поле
  setTimeout(() => {
    if (subscriptionNameEl) subscriptionNameEl.focus();
  }, 100);
}

function closeSubscriptionModal() {
  if (!subscriptionModalEl) return;
  
  subscriptionModalEl.classList.add('hidden');
  subscriptionModalEl.style.display = 'none';
  document.body.style.overflow = '';
  
  // Очистка формы
  subscriptionFormEl.reset();
  currentEditingSubscriptionId = null;
}

async function saveSubscription() {
  const name = subscriptionNameEl.value.trim();
  const description = subscriptionDescriptionEl.value.trim();
  const price = parseFloat(subscriptionPriceEl.value);
  const duration = parseInt(subscriptionDurationEl.value);
  const type = subscriptionTypeEl.value;
  const access = subscriptionAccessEl.value;
  const active = subscriptionActiveEl.value === 'true';
  
  // Собираем выбранные залы
  const gyms = [];
  if (subscriptionGymNemigaEl.checked) gyms.push('nemiga');
  if (subscriptionGymPrityckogoEl.checked) gyms.push('prityckogo');
  
  if (!name || !description || isNaN(price) || isNaN(duration) || gyms.length === 0) {
    showToast('Заполните все обязательные поля');
    return;
  }
  
  try {
    const subscriptions = getSubscriptions();
    const existingSubscription = currentEditingSubscriptionId ? getSubscriptionById(currentEditingSubscriptionId) : null;
    const subscriptionData = {
      id: currentEditingSubscriptionId || Date.now(),
      name,
      description,
      price,
      duration,
      type,
      access,
      gyms,
      active,
      currency: 'BYN',  // Добавляем валюту по умолчанию
      createdAt: existingSubscription && existingSubscription.createdAt ? existingSubscription.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      supabaseId: existingSubscription && existingSubscription.supabaseId ? existingSubscription.supabaseId : null
    };
    
    saveSubscriptionData(subscriptionData);
    
  } catch (error) {
    console.error('Ошибка при сохранении абонемента:', error);
    showToast('Ошибка при сохранении абонемента');
  }
}

async function saveSubscriptionData(subscriptionData) {
  console.log('[saveSubscriptionData] Starting save for subscription:', subscriptionData.name);
  
  const subscriptions = getSubscriptions();
  
  if (currentEditingSubscriptionId) {
    // Обновление существующего абонемента
    const index = subscriptions.findIndex(s => String(s.id) === String(currentEditingSubscriptionId));
    if (index !== -1) {
      const existingSubscription = subscriptions[index];
      const preservedSupabaseId = existingSubscription.supabaseId || null;
      
      subscriptions[index] = {
        ...existingSubscription,
        name: subscriptionData.name,
        description: subscriptionData.description,
        price: subscriptionData.price,
        currency: subscriptionData.currency || existingSubscription.currency || 'BYN',
        duration: subscriptionData.duration,
        type: subscriptionData.type,
        access: subscriptionData.access,
        gyms: subscriptionData.gyms,
        active: subscriptionData.active,
        updatedAt: subscriptionData.updatedAt,
        supabaseId: preservedSupabaseId
      };
    } else {
      console.error('[saveSubscriptionData] Subscription not found for editing! ID:', currentEditingSubscriptionId);
      showToast('Ошибка: абонемент не найден для редактирования');
      return;
    }
  } else {
    // Добавление нового абонемента
    subscriptions.push(subscriptionData);
  }
  
  localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
  
  showToast(currentEditingSubscriptionId ? 'Абонемент обновлен' : 'Абонемент добавлен');
  closeSubscriptionModal();
  renderAdminSubscriptions();
  
  // Обновляем секцию абонементов на сайте
  console.log('[saveSubscriptionData] Calling updateAbonementsSection after save');
  if (typeof updateAbonementsSection === 'function') {
    updateAbonementsSection();
  }
  
  // Дополнительная проверка через небольшую задержку
  setTimeout(() => {
    console.log('[saveSubscriptionData] Additional updateAbonementsSection call');
    if (typeof updateAbonementsSection === 'function') {
      updateAbonementsSection();
    }
  }, 100);
  
  // Еще одна проверка через большую задержку для надежности
  setTimeout(() => {
    console.log('[saveSubscriptionData] Final updateAbonementsSection call');
    if (typeof updateAbonementsSection === 'function') {
      updateAbonementsSection();
    }
  }, 1000);
  
  // Синхронизация с Supabase
  try {
    await syncSubscriptionWithSupabase(subscriptionData);
    console.log('[saveSubscriptionData] Supabase sync completed, loading from Supabase');
    
    // ОБЯЗАТЕЛЬНО загружаем ТОЛЬКО из Supabase после синхронизации (убираем дубликат)
    if (window.supabase && typeof loadSubscriptionsFromSupabase === 'function') {
      await loadSubscriptionsFromSupabase();
      console.log('[saveSubscriptionData] Reloaded from Supabase, local subscription removed');
    }
  } catch (error) {
    console.warn('Ошибка синхронизации с Supabase:', error);
  }
}

function renderAdminSubscriptions() {
  const host = document.getElementById('adminSubscriptionsList');
  if (!host) {
    console.log('[renderAdminSubscriptions] Host element not found');
    return;
  }
  
  try {
    const subscriptions = getSubscriptions();
    console.log('[renderAdminSubscriptions] Loaded subscriptions:', subscriptions);
    
    host.innerHTML = '';
    
    if (subscriptions.length === 0) {
      console.log('[renderAdminSubscriptions] No subscriptions found');
      const empty = document.createElement('div');
      empty.className = 'bookings-empty';
      empty.textContent = 'Абонементов нет';
      host.appendChild(empty);
      return;
    }
    
    subscriptions.forEach(subscription => {
      console.log('[renderAdminSubscriptions] Processing subscription:', subscription);
      const item = document.createElement('div');
      item.className = 'subscription-admin-item';
      
      // Проверяем, что все необходимые поля существуют
      const name = subscription.name || 'Без названия';
      const description = subscription.description || 'Без описания';
      const type = subscription.type || 'unknown';
      const access = subscription.access || 'Не указан';
      const duration = subscription.duration || 0;
      const price = subscription.price || 0;
      const gyms = subscription.gyms || [];
      const active = subscription.active !== undefined ? subscription.active : true;
      
      const gymNames = gyms.map(gym => {
        switch(gym) {
          case 'nemiga': return 'Немига Бизнес-центр';
          case 'prityckogo': return 'Притыцкого';
          default: return gym;
        }
      }).join(', ');
      
      const statusClass = active ? 'active' : 'inactive';
      const statusText = active ? 'Активный' : 'Неактивный';
      
      item.innerHTML = `
        <div class="subscription-admin-info">
          <h4>${name}</h4>
          <div class="subscription-admin-details">
            <p><strong>Описание:</strong> ${description}</p>
            <p><strong>Тип:</strong> ${getSubscriptionTypeName(type)}</p>
            <p><strong>Доступ:</strong> ${access}</p>
            <p><strong>Длительность:</strong> ${duration} дней</p>
            <p><strong>Залы:</strong> ${gymNames}</p>
          </div>
          <div class="subscription-admin-price">${price} BYN</div>
          <div class="subscription-admin-status ${statusClass}">${statusText}</div>
        </div>
        <div class="subscription-admin-actions">
          <button class="subscription-admin-btn edit" onclick="editSubscription('${subscription.id}')">
            ✏ Редактировать
          </button>
          <button class="subscription-admin-btn toggle" onclick="toggleSubscriptionStatus('${subscription.id}')">
            ${active ? '🔒 Деактивировать' : '🔓 Активировать'}
          </button>
          <button class="subscription-admin-btn delete" onclick="deleteSubscription('${subscription.id}')">
            🗑 Удалить
          </button>
        </div>
      `;
      
      host.appendChild(item);
    });
    
  } catch (error) {
    console.error('Ошибка при загрузке абонементов:', error);
    host.innerHTML = '<div class="bookings-empty">Ошибка при загрузке абонементов</div>';
  }
}

function getSubscriptions() {
  try {
    const raw = localStorage.getItem('subscriptions');
    console.log('[getSubscriptions] Raw localStorage data:', raw);
    const subscriptions = JSON.parse(raw || '[]');
    console.log('[getSubscriptions] Parsed subscriptions:', subscriptions);
    return subscriptions;
  } catch (error) {
    console.error('[getSubscriptions] Ошибка при загрузке абонементов:', error);
    return [];
  }
}

function getSubscriptionById(id) {
  const subscriptions = getSubscriptions();
  return subscriptions.find(s => s.id == id);
}

function getSubscriptionTypeName(type) {
  const types = {
    'trial': 'Пробное занятие',
    'single': 'Разовое занятие',
    'monthly': 'Месячный',
    'quarterly': 'Квартальный',
    'half-yearly': 'Полугодовой',
    'yearly': 'Годовой',
    'unlimited': 'Безлимитный'
  };
  return types[type] || type;
}

function editSubscription(subscriptionId) {
  openSubscriptionModal(subscriptionId);
}

function toggleSubscriptionStatus(subscriptionId) {
  const subscriptions = getSubscriptions();
  const subscription = subscriptions.find(s => s.id == subscriptionId);
  if (!subscription) return;
  
  subscription.active = !subscription.active;
  subscription.updatedAt = new Date().toISOString();
  
  localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
  
  showToast(`Абонемент ${subscription.active ? 'активирован' : 'деактивирован'}`);
  renderAdminSubscriptions();
  
  // Синхронизация с Supabase
  try {
    syncSubscriptionWithSupabase(subscription);
  } catch (error) {
    console.warn('Ошибка синхронизации с Supabase:', error);
  }
}

async function deleteSubscription(subscriptionId) {
  if (!confirm('Вы уверены, что хотите удалить этот абонемент? Это действие нельзя отменить.')) return;
  
  try {
    const subscriptions = getSubscriptions();
    const subscriptionToDelete = subscriptions.find(s => s.id == subscriptionId);
    
    const filteredSubscriptions = subscriptions.filter(s => s.id != subscriptionId);
    localStorage.setItem('subscriptions', JSON.stringify(filteredSubscriptions));
    
    showToast('Абонемент удален');
    renderAdminSubscriptions();
    
    // Обновляем секцию абонементов на сайте
    if (typeof updateAbonementsSection === 'function') {
      updateAbonementsSection();
    }
    
    // Синхронизация с Supabase - удаляем из БД
    if (subscriptionToDelete && subscriptionToDelete.supabaseId) {
      console.log('[deleteSubscription] Удаление из Supabase с ID:', subscriptionToDelete.supabaseId);
      await deleteSubscriptionFromSupabase(subscriptionToDelete.supabaseId);
    } else if (subscriptionToDelete) {
      console.log('[deleteSubscription] Абонемент не имеет supabaseId, удаление только из localStorage');
    }
    
  } catch (error) {
    console.error('Ошибка при удалении абонемента:', error);
    showToast('Ошибка при удалении абонемента');
  }
}

async function syncSubscriptionWithSupabase(subscriptionData) {
  console.log('[syncSubscriptionWithSupabase] Starting sync for subscription:', subscriptionData.name);
  
  if (!window.supabase) {
    console.log('[syncSubscriptionWithSupabase] Supabase not available');
    return;
  }
  
  try {
    // Создаем минимальную запись для Supabase
    const subscriptionRecord = {
      title: subscriptionData.name || 'Абонемент',
      description: subscriptionData.description || '',
      price_amount: parseFloat(subscriptionData.price) || 0,
      price_currency: subscriptionData.currency || 'BYN'
    };
    
    // Добавляем опциональные поля только если они есть
    if (subscriptionData.duration) {
      subscriptionRecord.duration_days = parseInt(subscriptionData.duration);
    }
    if (subscriptionData.type) {
      subscriptionRecord.type = subscriptionData.type;
    }
    if (subscriptionData.access) {
      subscriptionRecord.access_type = subscriptionData.access;
    }
    if (subscriptionData.gyms && Array.isArray(subscriptionData.gyms)) {
      subscriptionRecord.available_gyms = subscriptionData.gyms;
    }
    if (subscriptionData.active !== undefined) {
      subscriptionRecord.is_active = subscriptionData.active !== false;
    }
    
    console.log('[syncSubscriptionWithSupabase] Record to sync:', subscriptionRecord);
    
    // Проверяем, есть ли supabaseId для обновления
    const hasSupabaseId = subscriptionData.supabaseId || currentEditingSubscriptionId;
    
    if (hasSupabaseId) {
      // Обновление существующего абонемента
      const targetId = subscriptionData.supabaseId || currentEditingSubscriptionId;
      console.log('[syncSubscriptionWithSupabase] Trying to update subscription with ID:', targetId);
      
      const { data: updateData, error: updateError } = await supabase
        .from('plans')
        .update(subscriptionRecord)
        .eq('id', targetId)
        .select('id')
        .single();
      
      // Если запись не найдена (ошибка или пустой результат), создаем новую
      if (updateError || !updateData) {
        console.warn('[syncSubscriptionWithSupabase] Update failed, creating new subscription:', updateError);
        // Переходим к созданию новой записи
      } else {
        console.log('[supabase] subscription updated with ID:', updateData.id);
        return; // Успешно обновлено
      }
    }
    
    // Создание нового абонемента
    console.log('[syncSubscriptionWithSupabase] Creating new subscription');
    const { data, error } = await supabase
      .from('plans')
      .insert([subscriptionRecord])
      .select('id')
      .single();
    
    if (error) {
      console.error('[syncSubscriptionWithSupabase] Supabase insert error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        statusCode: error.statusCode
      });
      console.error('[syncSubscriptionWithSupabase] Full error object:', error);
      console.error('[syncSubscriptionWithSupabase] Record that failed:', JSON.stringify(subscriptionRecord, null, 2));
      throw error;
    }
    
    // Обновляем локальный ID с ID из Supabase
    if (data && data.id) {
      console.log('[syncSubscriptionWithSupabase] Got new ID from Supabase:', data.id);
      const subscriptions = getSubscriptions();
      const subscriptionIndex = subscriptions.findIndex(s => s.id === subscriptionData.id);
      if (subscriptionIndex !== -1) {
        subscriptions[subscriptionIndex].supabaseId = data.id;
        localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
        console.log('[syncSubscriptionWithSupabase] Updated localStorage with supabaseId');
      }
    }
    
    console.log('[supabase] subscription created with ID:', data?.id);
    
    console.log('[syncSubscriptionWithSupabase] Sync completed successfully');
  } catch (error) {
    console.error('[syncSubscriptionWithSupabase] sync subscription failed', error);
    console.error('[syncSubscriptionWithSupabase] Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
  }
}

async function deleteSubscriptionFromSupabase(supabaseId) {
  if (!window.supabase || !supabaseId) return;
  
  try {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', supabaseId);
    
    if (error) throw error;
    console.log('[supabase] subscription deleted from Supabase with ID:', supabaseId);
  } catch (error) {
    console.warn('[supabase] delete subscription failed', error);
  }
}

async function loadSubscriptionsFromSupabase() {
  console.log('[supabase] Starting to load subscriptions...');
  
  if (!window.supabase) {
    console.log('[supabase] Supabase not available');
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[supabase] Error fetching subscriptions:', error);
      throw error;
    }
    
    if (data && data.length > 0) {
      console.log('[loadSubscriptionsFromSupabase] Data from Supabase:', data);
      
      // Читаем ТОЛЬКО из Supabase, без локальных записей
      const subscriptionsFromSupabase = [];
      
      // Проходим по данным из Supabase
      data.forEach(supabaseItem => {
        // Конвертируем в локальный формат
        // Parse available_gyms if it's a JSON string
        let gyms = [];
        if (supabaseItem.available_gyms) {
          try {
            gyms = typeof supabaseItem.available_gyms === 'string' 
              ? JSON.parse(supabaseItem.available_gyms) 
              : supabaseItem.available_gyms;
          } catch (e) {
            console.warn('[loadSubscriptionsFromSupabase] Failed to parse available_gyms:', e);
            gyms = supabaseItem.available_gyms;
          }
        }
        
        const supabaseSubscription = {
          id: supabaseItem.id,
          supabaseId: supabaseItem.id,  // Сохраняем ID из Supabase
          name: supabaseItem.title || supabaseItem.name,  // title или name
          description: supabaseItem.description,
          price: supabaseItem.price_amount,
          currency: supabaseItem.price_currency || 'BYN',
          duration: supabaseItem.duration_days,
          type: supabaseItem.type,
          access: supabaseItem.access_type,
          gyms: gyms,
          active: supabaseItem.is_active,
          createdAt: supabaseItem.created_at,
          updatedAt: supabaseItem.updated_at
        };
        
        // Добавляем абонемент в массив (все из Supabase)
        console.log('[loadSubscriptionsFromSupabase] Adding subscription from Supabase:', supabaseSubscription.name);
        subscriptionsFromSupabase.push(supabaseSubscription);
      });
      
      // Сохраняем ТОЛЬКО данные из Supabase
      localStorage.setItem('subscriptions', JSON.stringify(subscriptionsFromSupabase));
      console.log('[supabase] Subscriptions loaded from Supabase only:', subscriptionsFromSupabase.length);
      
      // Обновляем админ-панель
      renderAdminSubscriptions();
      
      // Обновляем секцию абонементов на сайте
      console.log('[supabase] Calling updateAbonementsSection...');
      if (typeof updateAbonementsSection === 'function') {
        updateAbonementsSection();
      }
    } else {
      console.log('[supabase] No subscriptions found in database, clearing localStorage');
      // Если нет данных в Supabase, очищаем localStorage (читаем ТОЛЬКО из Supabase)
      localStorage.setItem('subscriptions', JSON.stringify([]));
      renderAdminSubscriptions();
    }
  } catch (error) {
    console.error('[supabase] load subscriptions failed', error);
  }
}


