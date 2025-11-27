document.addEventListener('DOMContentLoaded', function() {
    
    const mainContent = document.getElementById('content');
  const authOpenBtn = document.getElementById('authOpenBtn');
  const authModal = document.getElementById('authModal');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const authUtils = (window.AuthUtils && typeof window.AuthUtils === 'object') ? window.AuthUtils : null;
  if (!authUtils) {
    console.error('[functional] AuthUtils script не загружен');
    return;
  }
  const {
    isValidName,
    validatePassword,
    generateVerificationToken,
    buildVerificationLink
  } = authUtils;
  
    if (!mainContent) {
      console.error("Не найден основной контейнер контента");
      return;
    }

    

    // Сразу гарантируем, что модалка авторизации скрыта при загрузке
    try { if (authModal) { authModal.classList.add('hidden'); authModal.style.display = 'none'; document.body.style.overflow = ''; } } catch {}
    // Если URL содержит #login (например, после перезагрузки), убираем хэш, чтобы не провоцировать автопоказ
    try { if (location.hash === '#login') { history.replaceState(null, '', location.pathname + location.search); } } catch {}

    // ======= Авторизация / Регистрация (как в основном сайте) =======
    function updateAuthLinkUI() {
      const userJson = localStorage.getItem('currentUser');
      const isLogged = !!userJson;
      if (authOpenBtn) authOpenBtn.textContent = isLogged ? 'Выйти' : 'Войти';
      const greetHost = document.getElementById('content');
      if (!greetHost) return;
      let greet = document.getElementById('greetUser');
      if (isLogged) {
        const user = JSON.parse(userJson);
        if (!greet) {
          greet = document.createElement('div');
          greet.id = 'greetUser';
          greet.style.marginTop = '16px';
          greet.style.fontSize = '1.05rem';
          greetHost.appendChild(greet);
        }
        greet.textContent = `Здравствуйте, ${user.name || user.email}!`;
      } else if (greet) {
        greet.remove();
      }
    }

    function openAuthModal() {
      if (!authModal) return;
      authModal.classList.remove('hidden');
      authModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      switchTab('login');
    }
    function closeAuthModal() {
      if (!authModal) return;
      authModal.classList.add('hidden');
      authModal.style.display = 'none';
      document.body.style.overflow = '';
      clearErrors();
      if (loginForm) loginForm.reset();
      if (registerForm) registerForm.reset();
      resetPasswordToggles();
      // Сбрасываем счетчики символов
      resetCharCounters();
      // Сбрасываем индикатор силы пароля
      resetPasswordStrength();
    }
    function showToast(text) {
      const t = document.createElement('div');
      t.style.cssText = 'position:fixed;top:20px;right:20px;background:#222;color:#fff;padding:12px 16px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:2000;font-weight:600;';
      t.textContent = text;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2500);
    }
    function switchTab(tabName) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
      const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
      const form = document.getElementById(`${tabName}Form`);
      if (btn) btn.classList.add('active');
      if (form) form.classList.add('active');
      clearErrors();
    }
    function clearErrors() { document.querySelectorAll('.error').forEach(el => el.textContent = ''); }
    function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
    // Имя: только буквы (любой алфавит), допускаем пробел, дефис и апостроф; без цифр
    function readUsers() { try { return JSON.parse(localStorage.getItem('users') || '[]'); } catch { return []; } }
    function writeUsers(list) { localStorage.setItem('users', JSON.stringify(list)); }
    function setCurrentUser(user) { localStorage.setItem('currentUser', JSON.stringify(user)); try { toggleAdminUI(); } catch {} }
    function getCurrentUser() { try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { return null; } }
    function logout() {
      localStorage.removeItem('currentUser');
      updateAuthLinkUI();
      try { toggleAdminUI(); } catch {}
      // Если открыт админ-раздел — закрыть его
      try { if (typeof closeAdmin === 'function') closeAdmin(); } catch {}
    }

    // Делаем функции доступными глобально для profile.js и других модулей
    window.updateAuthLinkUI = updateAuthLinkUI;
    window.openAuthModal = openAuthModal;
    window.closeAuthModal = closeAuthModal;
    window.clearErrors = clearErrors;
    window.isValidEmail = isValidEmail;
    window.isValidName = isValidName;
    window.readUsers = readUsers;
    window.writeUsers = writeUsers;
    window.setCurrentUser = setCurrentUser;
    window.toggleAdminUI = toggleAdminUI;
    window.getCurrentUser = getCurrentUser;
    window.logout = logout;
    window.showToast = showToast;
  window.closeBecomeTrainer = function closeBecomeTrainer() {
    try {
      const sec = document.getElementById('become-trainer-section');
      const main = document.getElementById('content');
      if (!sec || !main) return;
      main.style.display = '';
      sec.classList.remove('active');
      setTimeout(() => {
        sec.classList.add('hidden');
        document.body.classList.remove('section-open');
        main.classList.remove('hidden-content');
      }, 600);
    } catch {}
  };
    // Утилита: очистить всех пользователей (доступна из консоли)
    window.clearAllAccounts = function clearAllAccounts() {
      try {
        localStorage.removeItem('users');
        localStorage.removeItem('currentUser');
        updateAuthLinkUI();
        showToast('Все учётные записи удалены');
        console.log('[Users] all accounts removed');
      } catch (e) { console.warn('[Users] remove error', e); }
    };

    // ===== Универсальное модальное подтверждение =====
    let confirmModalEl = null, confirmTextEl = null, confirmOkBtn = null, confirmCancelBtn = null, confirmOnYes = null;
    function initConfirmModal() {
      if (confirmModalEl) return;
      confirmModalEl = document.getElementById('confirmModal');
      if (!confirmModalEl) return;
      confirmTextEl = document.getElementById('confirmText');
      confirmOkBtn = document.getElementById('confirmOkBtn');
      confirmCancelBtn = document.getElementById('confirmCancelBtn');
      const close = () => { if (!confirmModalEl) return; confirmModalEl.classList.add('hidden'); confirmModalEl.style.display = 'none'; document.body.style.overflow = ''; };
      const onCancel = (e) => { e && e.preventDefault(); confirmOnYes = null; close(); };
      const onOk = (e) => { e && e.preventDefault(); const fn = confirmOnYes; confirmOnYes = null; close(); try { fn && fn(); } catch {} };
      if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', onCancel);
      if (confirmOkBtn) confirmOkBtn.addEventListener('click', onOk);
      // Закрытие по клику на фон
      confirmModalEl.addEventListener('click', function(e){ if (e.target === confirmModalEl) onCancel(e); });
    }
    function showConfirm(text, onYes) {
      initConfirmModal();
      if (!confirmModalEl) { if (onYes) try { onYes(); } catch {}; return; }
      if (confirmTextEl) confirmTextEl.textContent = text || 'Вы уверены?';
      confirmOnYes = onYes;
      confirmModalEl.classList.remove('hidden');
      confirmModalEl.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
    window.showConfirm = showConfirm;

    if (authOpenBtn) {
      authOpenBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (getCurrentUser()) {
          showConfirm('Вы уверены, что хотите выйти?', function(){ logout(); });
        } else {
          openAuthModal();
        }
      });
    }
    function navigateHome() {
      const closeFunctions = [
        'closeTrainers',
        'closeBecomeTrainer',
        'closeProfile',
        'closeAdmin',
        'closeManager',
        'closeAbonements',
        'closeContacts',
        'closeAbout',
        'closeBookModal',
        'closeBookingsModal',
        'closeTrainerClientsModal'
      ];
      closeFunctions.forEach((fnName) => {
        const fn = window[fnName] || self[fnName];
        if (typeof fn === 'function') {
          try { fn(); } catch (error) { console.warn(`[navigateHome] ${fnName} failed`, error); }
        }
      });
      const main = document.getElementById('content');
      if (main) {
        main.style.display = '';
        main.classList.remove('hidden-content');
      }
      document.body.classList.remove('section-open');
      const sectionsToReset = [
        'trainers-section',
        'become-trainer-section',
        'profile-section',
        'admin-section',
        'manager-section',
        'abonements-section',
        'contacts-section',
        'about-section'
      ];
      sectionsToReset.forEach((id) => {
        const section = document.getElementById(id);
        if (section) {
          section.classList.remove('active');
          section.classList.add('hidden');
        }
      });
      const modalsToClose = ['bookModal', 'bookingsModal', 'trainerClientsModal', 'authModal'];
      modalsToClose.forEach((id) => {
        const modal = document.getElementById(id);
        if (modal) {
          modal.classList.add('hidden');
          modal.style.display = 'none';
        }
      });
      try { history.replaceState('', document.title, window.location.pathname + window.location.search); } catch {}
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.navigateHome = navigateHome;

    const logoButtons = document.querySelectorAll('.logo');
    logoButtons.forEach((logo) => {
      logo.setAttribute('role', 'button');
      logo.setAttribute('tabindex', '0');
      logo.addEventListener('click', navigateHome);
      logo.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateHome();
        }
      });
    });

    // Мобильное меню: бургер
    try {
      const navToggle = document.getElementById('navToggle');
      const navMenu = document.getElementById('navMenu');
      if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
          navMenu.classList.toggle('open');
        });
        // Закрывать меню при клике по ссылке
        navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { navMenu.classList.remove('open'); }));
      }
    } catch {}
    // Закрытие по клику на фон с защитой от случайного закрытия при перетаскивании
    if (authModal) {
      let isDragging = false;
      let startTarget = null;
      
      authModal.addEventListener('mousedown', function(e) {
        startTarget = e.target;
        isDragging = false;
      });
      
      authModal.addEventListener('mousemove', function(e) {
        if (startTarget && e.target !== startTarget) {
          isDragging = true;
        }
      });
      
      authModal.addEventListener('click', function(e) {
        if (e.target === authModal && !isDragging) {
          closeAuthModal();
        }
        isDragging = false;
        startTarget = null;
      });
    }
    // Переключение вкладок
    document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', function() { switchTab(this.dataset.tab); }));

    

    if (loginForm) {
      loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearErrors();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        let ok = true;
        if (!email) { document.getElementById('loginEmailError').textContent = 'Введите email'; ok = false; }
        else if (!isValidEmail(email)) { document.getElementById('loginEmailError').textContent = 'Введите корректный email'; ok = false; }
        if (!password) { document.getElementById('loginPasswordError').textContent = 'Введите пароль'; ok = false; }
        if (!ok) return;
        const users = readUsers();
        const low = String(email).toLowerCase();
        let user = users.find(u => String(u.email||'').toLowerCase() === low && u.password === password);
        // Если найдены дубликаты одной почты, но пользователь уже найден —
        // предпочитаем верифицированную запись, не игнорируя проверку пароля
        if (user) {
          try {
            const dup = users.filter(u => String(u.email||'').toLowerCase() === low);
            const verified = dup.find(d => d.emailVerified === true);
            if (verified && verified.id !== user.id) {
              user = { ...verified, password: user.password };
            }
          } catch {}
        }
        // Фолбэк: пробуем найти пользователя в Supabase, если локально нет
        if (!user) {
          try {
            user = await attemptSupabaseLogin({ email, password });
            if (user) {
              // добавим/обновим локальную запись (не затирая роли/планы)
              const list = readUsers();
              const eidx = list.findIndex(u => String(u.email||'').toLowerCase() === low);
              if (eidx !== -1) {
                const prev = list[eidx] || {};
                list[eidx] = {
                  ...prev,
                  ...user,
                  id: prev.id || user.id,
                  plans: Array.isArray(prev.plans) ? prev.plans : user.plans || [],
                  bookings: Array.isArray(prev.bookings) ? prev.bookings : user.bookings || [],
                  roles: Array.isArray(prev.roles) ? prev.roles : user.roles || [],
                  isAdmin: prev.isAdmin || user.isAdmin || (String((prev.role||'')).toLowerCase()==='admin'),
                  isManager: prev.isManager || user.isManager || (String((prev.role||'')).toLowerCase()==='manager'),
                  isTrainer: prev.isTrainer || user.isTrainer,
                };
              } else {
                list.push(user);
              }
              writeUsers(list);
            }
          } catch {}
        }
        // Если в локальном списке есть верифицированная запись по той же почте — отметим текущего пользователя как подтверждённого
        try {
          const list = readUsers();
          const ref = list.find(u => String(u.email||'').toLowerCase() === low && u.emailVerified === true);
          if (ref && user) { user.emailVerified = true; }
        } catch {}
        if (!user) { document.getElementById('loginPasswordError').textContent = 'Неверный логин или пароль'; return; }
        // Авто-назначение роли admin/manager по email
        const lowEmail = String(email).toLowerCase();
        const idx = users.findIndex(u => u.id === user.id);
        if (lowEmail === 'purepulse676@gmail.com') {
          user.role = 'admin';
          if (idx !== -1) { users[idx].role = 'admin'; writeUsers(users); }
        }
        setCurrentUser(user);
        // Синхронизировать локального пользователя с Supabase (создать/найти запись и сохранить supabaseId)
        try { syncUserWithSupabase(user).then(() => {}); } catch {}
        updateAuthLinkUI();
        closeAuthModal();
        showToast('Вход выполнен');
        // Очищаем форму входа
        loginForm.reset();
        resetPasswordToggles();
        resetCharCounters();
        if (typeof renderProfile === 'function') { renderProfile(); }
      });
    }
    if (registerForm) {
      registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        clearErrors();
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value.trim();
        const password2 = document.getElementById('registerConfirmPassword').value.trim();
        let ok = true;
        if (!isValidName(name)) { const el = document.getElementById('registerNameError'); if (el) el.textContent = 'Имя: только буквы (без цифр и спецсимволов)'; ok = false; }
        if (!email || !isValidEmail(email)) { const el = document.getElementById('registerEmailError'); if (el) el.textContent = 'Введите корректный email'; ok = false; }
        
        // Валидация пароля с новыми требованиями
        const passwordValidation = validatePassword(password);
        if (!password || !passwordValidation.isValid) { 
            const el = document.getElementById('registerPasswordError'); 
            if (el) el.textContent = 'Пароль должен содержать минимум 8 символов, цифру и спец. символ'; 
            ok = false; 
        }
        if (password !== password2) { const el = document.getElementById('registerConfirmPasswordError'); if (el) el.textContent = 'Пароли не совпадают'; ok = false; }
        if (!ok) return;
        const users = readUsers();
        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) { const el = document.getElementById('registerEmailError'); if (el) el.textContent = 'Пользователь с таким email уже существует'; return; }
        // Создадим токен подтверждения и срок действия (24 часа)
        const verificationToken = generateVerificationToken();
        const verificationExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
        const newUser = { 
          id: Date.now(), 
          name, 
          email, 
          password, 
          plans: [], 
          registrationDate: new Date().toISOString(),
          emailVerified: false,
          verificationToken: verificationToken,
          verificationExpiresAt: verificationExpiresAt
        };
        const lowRegEmail = String(email).toLowerCase();
        if (lowRegEmail === 'purepulse676@gmail.com') { newUser.role = 'admin'; }
        users.push(newUser);
        writeUsers(users);
        setCurrentUser(newUser);
        try { syncUserWithSupabase(newUser).then(() => {}); } catch {}
        updateAuthLinkUI();
        closeAuthModal();
        showToast('Регистрация успешна');
        // Очищаем форму регистрации
        registerForm.reset();
        resetPasswordToggles();
        resetCharCounters();
        resetPasswordStrength();
        // Отправляем письмо с подтверждением регистрации (ссылка с токеном)
        try { sendRegistrationEmail({ 
          toEmail: email, 
          toName: name || email,
          verifyLink: buildVerificationLink(newUser.id, verificationToken)
        }); } catch {}
        if (typeof renderProfile === 'function') { renderProfile(); }
      });
    }

    // Авто-очистка по URL-параметру (?resetUsers=1)
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('resetUsers') === '1') {
        localStorage.removeItem('users');
        localStorage.removeItem('currentUser');
        console.log('[Users] reset via URL flag');
      }
      // Повторная отправка письма подтверждения: index.html?resendVerify=1&uid=...
      if (params.get('resendVerify') === '1') {
        const uid = params.get('uid');
        let targetUser = null;
        const list = readUsers();
        if (uid) {
          const idx = list.findIndex(u => String(u.id) === String(uid));
          if (idx !== -1) targetUser = list[idx];
        }
        if (!targetUser) {
          try { targetUser = getCurrentUser(); } catch {}
        }
        if (targetUser && targetUser.email) {
          // Обновим/сгенерируем токен, если отсутствует или истёк
          const now = Date.now();
          const needNew = !targetUser.verificationToken || !targetUser.verificationExpiresAt || now > Number(targetUser.verificationExpiresAt);
          if (needNew) {
            targetUser.verificationToken = generateVerificationToken();
            targetUser.verificationExpiresAt = now + 24 * 60 * 60 * 1000;
            // сохранить в users и currentUser
            const updIdx = list.findIndex(u => String(u.id) === String(targetUser.id));
            if (updIdx !== -1) { list[updIdx] = targetUser; writeUsers(list); }
            try { setCurrentUser(targetUser); } catch {}
          }
          const link = buildVerificationLink(targetUser.id, targetUser.verificationToken);
          try { sendRegistrationEmail({ toEmail: targetUser.email, toName: targetUser.name || targetUser.email, verifyLink: link }); showToast('Письмо с подтверждением отправлено повторно'); } catch {}
        } else {
          try { showToast('Не найден пользователь для повторной отправки'); } catch {}
        }
        // Убираем параметры из адресной строки
        try { history.replaceState(null, '', location.pathname); } catch {}
      }
    } catch {}

    // Восстановить состояние (не открываем модалку автоматически)
    updateAuthLinkUI();
    try { toggleAdminUI(); } catch {}
    if (getCurrentUser()) {
      // Пользователь авторизован — модалка точно скрыта
      try { closeAuthModal(); } catch {}
    } else if (authModal) {
      authModal.classList.add('hidden');
      authModal.style.display = 'none';
      document.body.style.overflow = '';
    }

  });
  
    function toggleAdminUI() {
      try {
        const adminLink = document.getElementById('adminLink');
        const managerLink = document.getElementById('managerLink');
        const u = getCurrentUser();
        const roles = (u && Array.isArray(u.roles)) ? u.roles : [];
        const roleStr = String(u && u.role || '').toLowerCase();
        const isAdmin = !!(u && (u.isAdmin || roles.includes('admin') || roleStr === 'admin'));
        const isManager = !!(u && (u.isManager || roles.includes('manager') || roleStr === 'manager'));
        if (adminLink) adminLink.style.display = isAdmin ? '' : 'none';
        if (managerLink) managerLink.style.display = isManager ? '' : 'none';
      } catch {}
    }
    
    // ===== Supabase helpers: sync user and save user_plans =====
    async function syncUserWithSupabase(localUser) {
      if (!window.supabase) return;
      try {
        const email = (localUser && localUser.email) || '';
        if (!email) return;
        // ищем пользователя в таблице users по email
        let { data, error } = await supabase.from('users').select('id,email').eq('email', email).limit(1);
        if (error) throw error;
        if (data && data.length) {
          localUser.supabaseId = data[0].id;
          setCurrentUser(localUser);
          return;
        }
        // создаём, если нет (минимальная запись)
        const payload = {
          name: localUser.name || null,
          email: email,
          password: localUser.password || null, // сохраняем пароль в открытом виде
          password_hash: 'local-only', // заглушка: используем Supabase Auth позже
          role: localUser.role === 'admin' ? 'admin' : 'user',
          phone: localUser.phone || null,
          avatar_url: localUser.avatarDataUrl || null
        };
        const ins = await supabase.from('users').insert([payload]).select('id').limit(1);
        if (ins.error) throw ins.error;
        const id = ins.data && ins.data[0] && ins.data[0].id;
        if (id) {
          localUser.supabaseId = id;
          setCurrentUser(localUser);
        }
      } catch (e) {
        console.warn('[supabase] sync user failed', e);
      }
    }
    // Сделаем доступным глобально для trainers.js
    try { window.syncUserWithSupabase = syncUserWithSupabase; } catch {}

    // Попытка логина через Supabase (если доступен)
    async function attemptSupabaseLogin({ email, password }) {
      if (!window.supabase) return null;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id,name,email,role,password')
          .eq('email', email)
          .eq('password', password)
          .limit(1);
        if (error) throw error;
        if (!data || !data.length) return null;
        const row = data[0];
        // Попробуем найти существующую локальную запись по email, чтобы не потерять роли/планы/id
        const list = readUsers();
        const low = String(email).toLowerCase();
        const existing = Array.isArray(list) ? list.find(u => String(u.email||'').toLowerCase() === low) : null;
        const base = existing || {};
        const merged = {
          id: existing ? existing.id : Date.now(),
          name: row.name || base.name || email,
          email: row.email,
          password: password,
          role: (row.role === 'admin' || row.role === 'manager') ? row.role : (base.role || 'user'),
          plans: Array.isArray(base.plans) ? base.plans : [],
          bookings: Array.isArray(base.bookings) ? base.bookings : [],
          roles: Array.isArray(base.roles) ? base.roles : [],
          isAdmin: !!base.isAdmin,
          isManager: !!base.isManager,
          isTrainer: !!base.isTrainer,
          registrationDate: base.registrationDate || new Date().toISOString(),
          emailVerified: base.emailVerified === true ? true : true, // помечаем верифицированным
          supabaseId: row.id,
          avatarDataUrl: base.avatarDataUrl || null,
          phone: base.phone || null,
        };
        return merged;
      } catch (e) {
        console.warn('[login] supabase fallback failed', e);
        return null;
      }
    }

    async function savePlanToSupabase({ user, planTitle }) {
      if (!window.supabase) return;
      try {
        // убедимся, что есть supabaseId
        if (!user.supabaseId) {
          await syncUserWithSupabase(user);
        }
        const userId = user.supabaseId;
        if (!userId) return;
        // найдём plan_id по названию
        const { data: plans, error: e1 } = await supabase.from('plans').select('id,title').eq('title', planTitle).limit(1);
        if (e1) throw e1;
        const planId = plans && plans[0] && plans[0].id;
        if (!planId) { console.warn('[supabase] plan not found:', planTitle); return; }
        // создаём запись в user_plans
        const { error: e2 } = await supabase.from('user_plans').insert([{ user_id: userId, plan_id: planId }]);
        if (e2) throw e2;
        console.log('[supabase] user_plans inserted');
      } catch (e) {
        console.warn('[supabase] save plan failed', e);
      }
    }
    
    // Делаем функцию доступной глобально
    window.savePlanToSupabase = savePlanToSupabase;

    // Функция для обновления пароля пользователя в Supabase
    async function updateUserPasswordInSupabase(user, newPassword) {
      if (!window.supabase) return;
      try {
        if (!user.supabaseId && typeof window.syncUserWithSupabase === 'function') {
          await window.syncUserWithSupabase(user);
          user = getCurrentUser();
        }
        const userId = user && user.supabaseId;
        if (!userId) return;
        const { error } = await supabase.from('users').update({ password: newPassword }).eq('id', userId);
        if (error) throw error;
        console.log('[supabase] user password updated');
      } catch (e) { 
        console.warn('[supabase] update password failed', e); 
      }
    }
    
    // Делаем функцию доступной глобально
    window.updateUserPasswordInSupabase = updateUserPasswordInSupabase;
  
  
  const themeSwitch = document.getElementById('themeSwitch');
  if (themeSwitch) {
    themeSwitch.addEventListener('change', function() {
      if (this.checked) {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
    });
  }

class SvgToggleEffect {
  constructor(effect) {
    if (!effect || !effect.element) return;
    effect.element.addEventListener('change', () => {
      this.nodes = [
        ...(effect.element.nextElementSibling
          ? effect.element.nextElementSibling.querySelectorAll('.switch rect')
          : [])
      ];

      if (!this.nodes.length) return;

      if (effect.random) {
        this.randomizeArray(this.nodes);
      }

      effect.handler(
        this.nodes,
        !effect.element.checked,
        effect.duration,
        effect.offset,
        effect.ease
      );
    });
  }

  randomizeArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

const svgSlideEffect = (
  nodes = [],
  reverse = false,
  duration = 0.6,
  offset = 0.02,
  ease = 'elastic.out(1.4, 0.4)'
) => {
  if (!window.gsap) return;
  window.gsap.to(nodes, {
    duration,
    ease,
    x: reverse ? 0 : 48,
    stagger: offset,
    overwrite: true
  });
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.gsap && window.EasePack) {
    window.gsap.registerPlugin(window.EasePack);
  }

  const sliderElement = document.getElementById('themeSwitch');
  if (!sliderElement || typeof window.gsap === 'undefined') return;

  new SvgToggleEffect({
    element: sliderElement,
    handler: svgSlideEffect,
    offset: 0.015,
    duration: 1.8,
    random: true,
    ease: 'elastic.out(1.4, 0.4)'
  });
});

// ===== Email: отправка письма после регистрации (REST API, без SDK) =====
function sendRegistrationEmail(opts) {
  const toEmail = opts && opts.toEmail;
  const toName = opts && opts.toName;
  const verifyLink = (opts && opts.verifyLink) || '';
  if (!toEmail) return;
  const serviceId = 'service_43bd3kq';
  const templateId = 'template_jm9a1sq';
  const publicKey = 'pMziW_fh-A3-nYlnw'; // EmailJS Public Key
  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: toEmail,
      to_name: toName || 'Пользователь',
      subject: 'Подтверждение регистрации на PurePulse',
      message: verifyLink
        ? `Для завершения регистрации подтвердите ваш e‑mail: ${verifyLink}\nЕсли вы не регистрировались — проигнорируйте это письмо.`
        : 'Вы успешно зарегистрировались на сайте PurePulse. Добро пожаловать!',
      verify_link: verifyLink,
      reply_to: toEmail
    }
  };
  console.log('[EmailJS REST] sending', payload);
  fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      console.log('[EmailJS REST] success');
      try { showToast('Письмо о регистрации отправлено'); } catch {}
    })
    .catch((err) => {
      console.warn('[EmailJS REST] error', err);
      try { showToast('Не удалось отправить письмо. Проверьте настройки EmailJS'); } catch {}
    });
}

// Хелпер: проверка подтверждения email
function isEmailVerified(user) {
  return !!(user && user.emailVerified === true);
}
window.isEmailVerified = isEmailVerified;

// ===== Заявка «Стать тренером» =====
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('becomeTrainerForm');
  if (!form) return;
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('btName').value.trim();
    const exp = document.getElementById('btExperience').value.trim();
    const about = document.getElementById('btAbout').value.trim();
    const phone = (document.getElementById('btPhone').value || '').trim();
    const gym = (document.getElementById('btGym').value || '').trim();
    const emailOpt = (document.getElementById('btEmail').value || '').trim();
    const fileInput = document.getElementById('btFile');
    // Валидации: имя (только буквы, 1..13), стаж (ровно 1-2 цифры, 0..99)
    if (!name || name.length > 13 || !isValidName(name)) { showToast('Имя: только буквы, до 13 символов'); return; }
    if (!/^\d{1,2}$/.test(exp)) { showToast('Стаж: введите число 1–99 (1-2 цифры)'); return; }
    if (Number(exp) < 1 || Number(exp) > 99) { showToast('Стаж должен быть от 1 до 99 лет'); return; }
    // Телефон обязателен: примем форматы с +, пробелами и дефисами, проверим по цифрам 10-15
    const digits = phone.replace(/\D/g, '');
    if (!digits || digits.length < 10 || digits.length > 15) { showToast('Введите корректный телефон для связи'); return; }
    // Email опционален, но если указан — валидируем
    if (emailOpt && !/^([^\s@]+)@([^\s@]+)\.[^\s@]+$/.test(emailOpt)) { showToast('Укажите корректный email или оставьте пустым'); return; }
    let fileName = '', fileBase64 = '';
    try {
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (file) {
        fileName = file.name;
        fileBase64 = await toBase64(file);
      }
    } catch {}
    try {
      await sendTrainerApplication({ name, exp, about, gym, phone, emailOpt, fileName, fileBase64 });
      showToast('Заявка отправлена');
      form.reset();
    } catch {
      showToast('Не удалось отправить заявку');
    }
  });
});

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function sendTrainerApplication({ name, exp, about, gym, phone, emailOpt, fileName, fileBase64 }) {
  // EmailJS REST через общий сервис/шаблон
  const serviceId = 'service_43bd3kq';
  const templateId = 'template_92qvzl9';
  const publicKey = 'pMziW_fh-A3-nYlnw';
  const adminEmail = 'purepulse676@gmail.com';
  
  // Упрощенные параметры без вложений
  const templateParams = {
    to_email: adminEmail,
    to_name: 'Администратор',
    subject: 'Новая заявка: Стать тренером',
    name: String(name || '').substring(0, 50),
    exp: String(exp || '').substring(0, 10),
    about: String(about || '').substring(0, 500),
    gym: String(gym || '').substring(0, 50),
    phone: String(phone || '').substring(0, 20),
    email: String(emailOpt || '').substring(0, 100),
    has_attachment: fileBase64 ? 'Да (файл: ' + String(fileName || 'без названия').substring(0, 50) + ')' : 'Нет'
  };

  // Валидация обязательных параметров
  if (!templateParams.name || !templateParams.phone) {
    throw new Error('Недостаточно данных для отправки заявки');
  }

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: templateParams
  };

  console.log('[EmailJS] Отправка заявки тренера:', { serviceId, templateId, publicKey });

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[EmailJS] Ошибка ответа:', res.status, text);
      throw new Error(`EmailJS HTTP ${res.status}: ${text}`);
    }
    
    console.log('[EmailJS] Заявка тренера отправлена успешно');
  } catch (error) {
    console.error('[EmailJS] Ошибка отправки заявки тренера:', error);
    throw error;
  }
}

// Функция для создания счетчиков символов
function createCharCounter(inputElement, maxLength, counterClass) {
    const counter = document.createElement('div');
    counter.className = counterClass;
    counter.textContent = `0/${maxLength}`;
    
    const updateCounter = () => {
        const currentLength = inputElement.value.length;
        counter.textContent = `${currentLength}/${maxLength}`;
        
        if (currentLength > maxLength * 0.9) {
            counter.style.color = '#ff6b6b';
        } else if (currentLength > maxLength * 0.7) {
            counter.style.color = '#ffa500';
        } else {
            counter.style.color = '#999';
        }
    };
    
    inputElement.addEventListener('input', updateCounter);
    inputElement.parentElement.style.position = 'relative';
    inputElement.parentElement.appendChild(counter);
    
    updateCounter();
}

// Функция обновления индикатора силы пароля
function updatePasswordStrength(password) {
    const strengthBar = document.querySelector('.password-strength-fill');
    const requirements = document.querySelectorAll('.requirement');
    
    if (!strengthBar || !requirements.length) return;
    
    const validation = validatePassword(password);
    
    // Обновляем полоску
    strengthBar.className = 'password-strength-fill';
    if (password.length > 0) {
        strengthBar.classList.add(validation.strength);
    }
    
    // Обновляем требования
    requirements.forEach(req => {
        const type = req.dataset.requirement;
        if (validation.requirements[type]) {
            req.classList.add('valid');
        } else {
            req.classList.remove('valid');
        }
    });
}

// Функция для переключения видимости пароля
function togglePasswordVisibility(inputId, toggleId) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);
    
    if (!input || !toggle) return;
    
    // Инициализируем состояние (пароль скрыт по умолчанию)
    const eyeIcon = toggle.querySelector('.eye-icon');
    if (eyeIcon) {
        eyeIcon.className = 'eye-icon eye-closed';
        eyeIcon.textContent = '👁';
    }
    
    toggle.addEventListener('click', function() {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggle.classList.toggle('active', !isPassword);
        
        // Обновляем иконку
        if (eyeIcon) {
            if (isPassword) {
                // Пароль скрыт - показываем закрытый глаз
                eyeIcon.textContent = '👁';
                eyeIcon.className = 'eye-icon eye-closed';
            } else {
                // Пароль виден - показываем открытый глаз
                eyeIcon.textContent = '👁';
                eyeIcon.className = 'eye-icon eye-open';
            }
        }
    });
}

// Функция для сброса состояния кнопок показа пароля
function resetPasswordToggles() {
    const toggles = document.querySelectorAll('.password-toggle');
    toggles.forEach(toggle => {
        const input = toggle.parentElement.querySelector('input');
        const eyeIcon = toggle.querySelector('.eye-icon');
        
        if (input && eyeIcon) {
            input.type = 'password';
            toggle.classList.remove('active');
            eyeIcon.className = 'eye-icon eye-closed';
            eyeIcon.textContent = '👁';
        }
    });
}

// Функция для сброса счетчиков символов
function resetCharCounters() {
    const counters = document.querySelectorAll('.auth-char-counter, .profile-char-counter, .book-char-counter');
    counters.forEach(counter => {
        const input = counter.parentElement.querySelector('input, textarea');
        if (input) {
            const maxLength = input.getAttribute('maxlength');
            if (maxLength) {
                counter.textContent = `0/${maxLength}`;
                counter.style.color = '#999';
            }
        }
    });
}

// Функция для сброса индикатора силы пароля
function resetPasswordStrength() {
    const strengthBar = document.querySelector('.password-strength-fill');
    if (strengthBar) {
        strengthBar.className = 'password-strength-fill';
    }
    
    const requirements = document.querySelectorAll('.requirement');
    requirements.forEach(req => {
        req.classList.remove('valid');
    });
}

// Инициализация счетчиков символов и валидации пароля
document.addEventListener('DOMContentLoaded', function() {
    // Счетчик для поля имени в регистрации
    const registerNameInput = document.getElementById('registerName');
    if (registerNameInput) {
        createCharCounter(registerNameInput, 15, 'auth-char-counter');
    }
    
    // Счетчик для поля имени в профиле
    const profileNameInput = document.getElementById('profileName');
    if (profileNameInput) {
        createCharCounter(profileNameInput, 15, 'profile-char-counter');
    }
    
    // Счетчик для поля пожеланий в записи на тренировку
    const bookNotesInput = document.getElementById('bookNotes');
    if (bookNotesInput) {
        createCharCounter(bookNotesInput, 60, 'book-char-counter');
    }
    
    // Валидация пароля
    const registerPasswordInput = document.getElementById('registerPassword');
    if (registerPasswordInput) {
        registerPasswordInput.addEventListener('input', function() {
            updatePasswordStrength(this.value);
        });
    }
    
    // Инициализация кнопок показа пароля
    togglePasswordVisibility('loginPassword', 'loginPasswordToggle');
    togglePasswordVisibility('registerPassword', 'registerPasswordToggle');
    togglePasswordVisibility('registerConfirmPassword', 'registerConfirmPasswordToggle');
});