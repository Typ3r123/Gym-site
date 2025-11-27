document.addEventListener('DOMContentLoaded', function() {
  const abonementsLink = document.querySelector('a[href="#abonements"]');
  const abonementsSection = document.getElementById('abonements-section');
  const mainContent = document.getElementById('content');

  if (abonementsLink && abonementsSection && mainContent) {
    abonementsLink.addEventListener('click', function(e) {
      e.preventDefault();
      openAbonementsSection();
    });
  }
  
  // Глобальная функция для открытия раздела Абонементы (используется из контактов)
  window.openAbonementsSection = function openAbonementsSection() {
    if (!abonementsSection || !mainContent) return;
    // Закрыть другие секции, если открыты
    try {
      const other = document.getElementById('contacts-section');
      if (other && other.classList.contains('active')) {
        other.classList.remove('active');
        setTimeout(() => { other.classList.add('hidden'); }, 600);
      }
    } catch {}
    mainContent.classList.add('hidden-content');
    abonementsSection.classList.remove('hidden');
    setTimeout(() => { abonementsSection.classList.add('active'); }, 10);
    setTimeout(() => { mainContent.style.display = 'none'; }, 600);
    document.body.classList.add('section-open');
    // Прокрутка к началу раздела на случай, если страница прокручена
    try { abonementsSection.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
    // Подгрузить планы из БД (Supabase) при открытии
    try { loadPlansFromSupabase(); } catch {}
  };
});

function closeAbonements() {
  const abonementsSection = document.getElementById('abonements-section');
  const mainContent = document.getElementById('content');

  if (!abonementsSection || !mainContent) {
    console.error("Не найдены элементы для закрытия абонементов");
    return;
  }

  mainContent.style.display = '';
  abonementsSection.classList.remove('active');
  setTimeout(() => {
    abonementsSection.classList.add('hidden');
    mainContent.classList.remove('hidden-content');
    document.body.classList.remove('section-open');
  }, 600);
}


// ====== Загрузка тарифов из Supabase и отрисовка ======
let plansLoadedOnce = false;
async function loadPlansFromSupabase() {
  const host = document.querySelector('#abonements-section .trainers-container');
  if (!host) return;
  
  try {
    // Получаем абонементы из localStorage для fallback (если Supabase недоступен)
    let adminSubscriptions = [];
    try {
      const subscriptionsData = localStorage.getItem('subscriptions');
      if (subscriptionsData) {
        adminSubscriptions = JSON.parse(subscriptionsData);
      }
    } catch (e) {
      console.warn('[loadPlansFromSupabase] Error parsing subscriptions:', e);
    }
    
    const activeAdminPlans = adminSubscriptions.filter(s => s.active === true || s.active === undefined);
    
    if (window.supabase && typeof window.supabase.from === 'function') {
      const placeholder = document.createElement('div');
      placeholder.style.color = '#bbb';
      placeholder.textContent = 'Загрузка тарифов...';
      host.appendChild(placeholder);
      
      const { data, error } = await window.supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price_amount', { ascending: true });
      
      if (error) throw error;
      
      host.innerHTML = '';
      
      const allPlans = [];
      
      // Добавляем ТОЛЬКО планы из Supabase (источник правды)
      if (data && data.length) {
        data.forEach((p) => {
          allPlans.push({
            title: p.title || p.name || 'Абонемент',
            description: p.description || '',
            price: p.price_amount || 0,
            currency: p.price_currency || 'BYN',
            duration: p.duration_days || null,
            type: p.type || null,
            access: p.access_type || null,
            gyms: p.available_gyms || null
          });
        });
      }
      
      if (allPlans.length === 0) {
        host.innerHTML = '<div style="color:#bbb;">Пока нет активных тарифов</div>';
        return;
      }
      
      allPlans.forEach((p) => {
        const card = document.createElement('div');
        card.className = 'trainer-card';
        const priceStr = `${p.price} ${p.currency}`;
        const planTitle = escapeHtml(p.title);
        const isOwned = isPlanAlreadyOwned(planTitle);
        const buttonText = isOwned ? '✓ Уже есть' : 'Выбрать';
        const buttonStyle = isOwned ? 'background: #4ecdc4; color: white; cursor: not-allowed;' : 'background: #ffcc00; color: #000; cursor: pointer;';
        
        card.innerHTML = `
          <h3>${planTitle}</h3>
          <p>${escapeHtml(p.description)}</p>
          <p class="plan-price">${escapeHtml(priceStr)}</p>
          <button class="plan-button" style="${buttonStyle}" ${isOwned ? 'disabled' : ''}>${buttonText}</button>
        `;
        
        // Сохраняем дополнительные данные в dataset карточки
        card.dataset.duration = p.duration || '';
        card.dataset.type = p.type || '';
        card.dataset.access = p.access || '';
        card.dataset.gyms = p.gyms ? JSON.stringify(p.gyms) : '';
        
        const button = card.querySelector('.plan-button');
        button.addEventListener('click', function() {
          purchasePlan(planTitle);
        });
        
        host.appendChild(card);
      });
    } else {
      // Если Supabase недоступен, показываем только localStorage
      host.innerHTML = '';
      
      if (activeAdminPlans.length === 0) {
        host.innerHTML = '<div style="color:#bbb; text-align:center; padding:40px;">Пока нет активных тарифов. Добавьте абонементы в админ-панели.</div>';
        return;
      }
      
      activeAdminPlans.forEach((s) => {
        const card = document.createElement('div');
        card.className = 'trainer-card';
        const currency = s.currency || 'BYN';
        const priceStr = `${s.price} ${currency}`;
        const planTitle = escapeHtml(s.name || 'Абонемент');
        const isOwned = isPlanAlreadyOwned(planTitle);
        const buttonText = isOwned ? '✓ Уже есть' : 'Выбрать';
        const buttonStyle = isOwned ? 'background: #4ecdc4; color: white; cursor: not-allowed;' : 'background: #ffcc00; color: #000; cursor: pointer;';
        
        card.innerHTML = `
          <h3>${planTitle}</h3>
          <p>${escapeHtml(s.description || '')}</p>
          <p class="plan-price">${escapeHtml(priceStr)}</p>
          <button class="plan-button" style="${buttonStyle}" ${isOwned ? 'disabled' : ''}>${buttonText}</button>
        `;
        
        const button = card.querySelector('.plan-button');
        button.addEventListener('click', function() {
          purchasePlan(planTitle);
        });
        
        host.appendChild(card);
      });
    }
    
    plansLoadedOnce = true;
  } catch (e) {
    console.warn('[plans] load error', e);
    try {
      const warn = document.createElement('div');
      warn.style.color = '#f66';
      warn.style.width = '100%';
      warn.style.textAlign = 'center';
      warn.style.marginTop = '8px';
      warn.textContent = 'Не удалось загрузить тарифы из БД';
      host && host.appendChild(warn);
    } catch {}
  }
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Функция для открытия детального окна абонемента
function openPlanDetails(planName, description, priceText, extraInfo = null) {
  const modal = document.getElementById('planDetailsModal');
  const titleEl = document.getElementById('planDetailsTitle');
  const descEl = document.getElementById('planDetailsDescription');
  const extraInfoEl = document.getElementById('planDetailsExtraInfo');
  const currencySelect = document.getElementById('planCurrency');
  
  if (!modal) return;
  
  // Устанавливаем информацию об абонементе
  titleEl.textContent = planName;
  descEl.textContent = description || '';
  descEl.style.whiteSpace = 'pre-line'; // Разрешаем перенос строк
  
  // Сбрасываем выбор способа оплаты и отключаем кнопку оплаты
  const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
  paymentMethods.forEach(method => {
    method.checked = false;
  });
  const purchaseBtn = document.getElementById('planDetailsPurchaseBtn');
  if (purchaseBtn) {
    purchaseBtn.disabled = true;
  }
  
  // Отображаем дополнительную информацию
  if (extraInfo && extraInfoEl) {
    let extraHTML = '';
    
    if (extraInfo.duration) {
      extraHTML += `<div class="plan-extra-item"><strong>Срок действия:</strong> ${extraInfo.duration} дней</div>`;
    }
    
    if (extraInfo.type) {
      const typeNames = {
        'trial': 'Пробное занятие',
        'single': 'Разовое занятие',
        'monthly': 'Месячный',
        'quarterly': 'Квартальный',
        'half-yearly': 'Полугодовой',
        'yearly': 'Годовой',
        'unlimited': 'Безлимитный'
      };
      extraHTML += `<div class="plan-extra-item"><strong>Тип:</strong> ${typeNames[extraInfo.type] || extraInfo.type}</div>`;
    }
    
    if (extraInfo.access) {
      const accessNames = {
        '24/7': '24/7',
        'daytime': 'Дневное время (8:00-18:00)',
        'evening': 'Вечернее время (18:00-22:00)',
        'morning': 'Утреннее время (6:00-12:00)'
      };
      extraHTML += `<div class="plan-extra-item"><strong>Доступ:</strong> ${accessNames[extraInfo.access] || extraInfo.access}</div>`;
    }
    
    if (extraInfo.gyms && Array.isArray(extraInfo.gyms) && extraInfo.gyms.length > 0) {
      const gymNames = {
        'nemiga': 'Немига Бизнес-центр',
        'prityckogo': 'Притыцкого'
      };
      const gymsList = extraInfo.gyms.map(g => gymNames[g] || g).join(', ');
      extraHTML += `<div class="plan-extra-item"><strong>Доступные залы:</strong> ${gymsList}</div>`;
    }
    
    extraInfoEl.innerHTML = extraHTML;
  } else if (extraInfoEl) {
    extraInfoEl.innerHTML = '';
  }
  
  // Сохраняем исходную цену и название плана в dataset
  modal.dataset.planName = planName;
  modal.dataset.originalPrice = priceText;
  modal.dataset.duration = extraInfo?.duration || '';
  modal.dataset.planType = extraInfo?.type || '';
  
  // Извлекаем цену и валюту
  let basePrice = 0;
  let baseCurrency = 'BYN';
  const priceMatch = priceText.match(/([\d.]+)\s*([A-Z]+)/);
  if (priceMatch) {
    basePrice = parseFloat(priceMatch[1]);
    baseCurrency = priceMatch[2] || 'BYN';
  }
  
  modal.dataset.basePrice = basePrice;
  modal.dataset.baseCurrency = baseCurrency;
  
  // Сбрасываем выбор валюты на BYN
  if (currencySelect) {
    currencySelect.value = 'BYN';
  }
  
  // Устанавливаем начальную цену
  updatePlanPrice(basePrice, baseCurrency, 'BYN', basePrice);
  
  // Убедимся, что кнопка оплаты включена, если выбран способ оплаты
  const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
  const paymentBtn = document.getElementById('planDetailsPurchaseBtn');
  if (paymentBtn) {
    paymentBtn.disabled = !selectedPayment;
  }
  
  // Инициализируем поля дат
  initializePlanDates();
  
  // Показываем модальное окно
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// Функция инициализации полей дат
function initializePlanDates() {
  const startDateInput = document.getElementById('planStartDate');
  const endDateInput = document.getElementById('planEndDate');
  
  if (!startDateInput || !endDateInput) return;
  
  // Устанавливаем минимальную дату: окончание последнего активного абонемента или сегодня
  let minStartStr = new Date().toISOString().split('T')[0];
  try {
    const user = getCurrentUser();
    if (user) {
      const iso = getNextPlanStartDate(user); // ISO с временем
      if (iso) minStartStr = new Date(iso).toISOString().split('T')[0];
    }
  } catch {}
  startDateInput.min = minStartStr;
  endDateInput.min = minStartStr;
  // Делаем дату окончания только для чтения и автозаполняемой
  endDateInput.readOnly = true;
  endDateInput.setAttribute('tabindex', '-1');
  endDateInput.setAttribute('aria-disabled', 'true');
  endDateInput.style.opacity = '0.75';
  endDateInput.style.cursor = 'not-allowed';
  
  // Устанавливаем максимальную дату (через год)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  startDateInput.max = maxDate.toISOString().split('T')[0];
  endDateInput.max = maxDate.toISOString().split('T')[0];
  
  // Устанавливаем начальные значения
  startDateInput.value = minStartStr;
  // Заполняем дату окончания от длительности
  try {
    const modal = document.getElementById('planDetailsModal');
    const durationDays = parseInt(modal && modal.dataset.duration) || 30;
    const end = new Date(minStartStr);
    end.setDate(end.getDate() + durationDays);
    endDateInput.value = end.toISOString().split('T')[0];
  } catch {}
  
  // Обработчики изменения дат
  startDateInput.addEventListener('change', function() {
    // При изменении начала — пересчитать окончание
    const modal = document.getElementById('planDetailsModal');
    const durationDays = parseInt(modal && modal.dataset.duration) || 30;
    const start = new Date(startDateInput.value);
    const end = new Date(start);
    end.setDate(end.getDate() + durationDays);
    endDateInput.value = end.toISOString().split('T')[0];
    validatePlanDates();
  });
}

// Функция валидации дат
function validatePlanDates() {
  const startDateInput = document.getElementById('planStartDate');
  const endDateInput = document.getElementById('planEndDate');
  const startError = document.getElementById('planStartDateError');
  const endError = document.getElementById('planEndDateError');
  
  if (!startDateInput || !endDateInput) return true;
  
  // Очищаем предыдущие ошибки
  if (startError) startError.textContent = '';
  if (endError) endError.textContent = '';
  
  const startDate = new Date(startDateInput.value);
  const endDate = new Date(endDateInput.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let isValid = true;
  
  // Проверяем дату начала
  // Минимально допустимая дата — либо сегодня, либо окончание последнего активного абонемента
  let minStart = new Date(today);
  try {
    const user = getCurrentUser();
    if (user) {
      const iso = getNextPlanStartDate(user);
      if (iso) {
        const next = new Date(iso);
        next.setHours(0,0,0,0);
        if (next > minStart) minStart = next;
      }
    }
  } catch {}
  if (startDate < minStart) {
    if (startError) startError.textContent = 'Дата начала не может пересекаться с действующим абонементом';
    isValid = false;
  }
  // Консистентность конца поддерживается автозаполнением; дополнительных проверок не нужно
  
  return isValid;
}

// Функция для обновления цены в модальном окне
async function updatePlanPrice(basePrice, baseCurrency, targetCurrency, currentPrice) {
  const priceDisplay = document.getElementById('planPriceDisplay');
  if (!priceDisplay) return;
  
  // Добавляем анимацию обновления
  priceDisplay.classList.add('updating');
  
  // Если валюты одинаковые, просто отображаем цену
  if (baseCurrency === targetCurrency) {
    const formattedPrice = formatPrice(basePrice, targetCurrency);
    setTimeout(() => {
      priceDisplay.textContent = formattedPrice;
      priceDisplay.classList.remove('updating');
    }, 250);
    return;
  }
  
  // Получаем курс обмена
  try {
    // Показываем индикатор загрузки
    priceDisplay.textContent = 'Загрузка...';
    
    const rate = await getExchangeRate(baseCurrency, targetCurrency);
    const convertedPrice = basePrice * rate;
    const formattedPrice = formatPrice(convertedPrice, targetCurrency);
    
    setTimeout(() => {
      priceDisplay.textContent = formattedPrice;
      priceDisplay.classList.remove('updating');
    }, 300);
  } catch (error) {
    // В случае ошибки показываем цену с примерным курсом
    let convertedPrice = basePrice;
    if (baseCurrency === 'BYN' && targetCurrency === 'RUB') {
      convertedPrice = basePrice * 29; // Примерный курс 1 BYN = 29 RUB
    } else if (baseCurrency === 'RUB' && targetCurrency === 'BYN') {
      convertedPrice = basePrice / 29;
    }
    const formattedPrice = formatPrice(convertedPrice, targetCurrency);
    setTimeout(() => {
      priceDisplay.textContent = formattedPrice + ' (примерно)';
      priceDisplay.classList.remove('updating');
    }, 300);
  }
}

// Функция для получения курса валют
async function getExchangeRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1;
  
  // Примерные курсы (1 BYN ≈ 29 RUB по состоянию на 2024-2025)
  const approximateRates = {
    'BYN_to_RUB': 29,
    'RUB_to_BYN': 1/29,
    'BYN_to_USD': 0.31,
    'USD_to_BYN': 1/0.31,
    'RUB_to_USD': 29/0.31,
    'USD_to_RUB': 0.31/29
  };
  
  // Используем только фиксированные курсы (API НБРБ недоступен)
  const key = `${fromCurrency}_to_${toCurrency}`;
  if (approximateRates[key]) {
    return approximateRates[key];
  }
  
  // Если конверсия недоступна, возвращаем курс 1:1
  return 1;
  
  // Закомментировано - API НБРБ возвращает 404
  /*
  try {
    // Используем API Национального банка Беларуси
    let currencyId, isReverse = false;
    
    // Определяем, какой курс нужен
    if ((fromCurrency === 'BYN' && toCurrency === 'RUB') || 
        (fromCurrency === 'RUB' && toCurrency === 'BYN')) {
      currencyId = 826; // RUB
      if (fromCurrency === 'RUB') isReverse = true;
    } else if ((fromCurrency === 'BYN' && toCurrency === 'USD') || 
               (fromCurrency === 'USD' && toCurrency === 'BYN')) {
      currencyId = 840; // USD
      if (fromCurrency === 'USD') isReverse = true;
    } else {
      // Обратная конверсия через BYN
      if (fromCurrency === 'RUB' && toCurrency === 'USD') {
        // Сначала получаем RUB к BYN, потом USD к BYN
        const rubResponse = await fetch('https://www.nbrb.by/api/exrates/rates/826?parammode=2');
        const usdResponse = await fetch('https://www.nbrb.by/api/exrates/rates/840?parammode=2');
        
        if (!rubResponse.ok || !usdResponse.ok) throw new Error('API НБРБ не доступен');
        
        const rubData = await rubResponse.json();
        const usdData = await usdResponse.json();
        
        const rubToByn = rubData.Cur_OfficialRate / rubData.Cur_Scale;
        const usdToByn = usdData.Cur_OfficialRate / usdData.Cur_Scale;
        
        // 1 RUB = rubToByn BYN, 1 USD = usdToByn BYN
        // 1 RUB = (rubToByn / usdToByn) USD
        return rubToByn / usdToByn;
      } else if (fromCurrency === 'USD' && toCurrency === 'RUB') {
        const rubResponse = await fetch('https://www.nbrb.by/api/exrates/rates/826?parammode=2');
        const usdResponse = await fetch('https://www.nbrb.by/api/exrates/rates/840?parammode=2');
        
        if (!rubResponse.ok || !usdResponse.ok) throw new Error('API НБРБ не доступен');
        
        const rubData = await rubResponse.json();
        const usdData = await usdResponse.json();
        
        const rubToByn = rubData.Cur_OfficialRate / rubData.Cur_Scale;
        const usdToByn = usdData.Cur_OfficialRate / usdData.Cur_Scale;
        
        // 1 USD = usdToByn BYN, 1 RUB = rubToByn BYN
        // 1 USD = (usdToByn / rubToByn) RUB
        return usdToByn / rubToByn;
      }
      
      throw new Error('Неподдерживаемая конверсия');
    }
    
    // Получаем курс с API НБРБ
    const response = await fetch(`https://www.nbrb.by/api/exrates/rates/${currencyId}?parammode=2`);
    if (!response.ok) throw new Error('API НБРБ не доступен');
    
    const data = await response.json();
    
    // API НБРБ возвращает курс с учетом Cur_Scale (например, 100)
    // Cur_OfficialRate - курс за Cur_Scale единиц валюты
    const scale = data.Cur_Scale || 1;
    const officialRate = data.Cur_OfficialRate;
    
    // Находим курс 1 единицы валюты в BYN
    const currencyToBynRate = officialRate / scale;
    
    if (isReverse) {
      return currencyToBynRate;
    } else {
      return 1 / currencyToBynRate;
    }
    
  } catch (error) {
    // Тихо используем фиксированный курс если API НБРБ недоступен
    const key = `${fromCurrency}_to_${toCurrency}`;
    if (approximateRates[key]) {
      return approximateRates[key];
    }
    
    // Если конверсия недоступна, возвращаем курс 1:1
    return 1;
  }
  */
}

// Функция для форматирования цены
function formatPrice(price, currency) {
  const rounded = Math.round(price * 100) / 100;
  return `${rounded.toFixed(2)} ${currency}`;
}

// Функция для закрытия модального окна деталей
function closePlanDetailsModal() {
  const modal = document.getElementById('planDetailsModal');
  if (!modal) return;
  
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

// Делаем функцию глобальной
window.closePlanDetailsModal = closePlanDetailsModal;

// ===== Оплата картой =====
function openCardPayModal(ctx) {
  const modal = document.getElementById('cardPayModal');
  if (!modal) return;
  modal.dataset.planName = ctx && ctx.planName || '';
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeCardPayModal() {
  const modal = document.getElementById('cardPayModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', function(){
  const cardModal = document.getElementById('cardPayModal');
  const closeBtn = document.querySelector('.cardpay-close');
  const cancelBtn = document.getElementById('cardPayCancel');
  const form = document.getElementById('cardPayForm');
  const num = document.getElementById('cardNumber');
  const exp = document.getElementById('cardExpiry');
  const cvc = document.getElementById('cardCvc');
  const holder = document.getElementById('cardHolder');
  const status = document.getElementById('cardPayStatus');

  function fmtNumber(v){ return String(v||'').replace(/\D+/g,'').slice(0,16).replace(/(\d{4})(?=\d)/g,'$1 ').trim(); }
  function fmtExp(v){ return String(v||'').replace(/\D+/g,'').slice(0,4).replace(/(\d{2})(?=\d)/,'$1/'); }
  function luhnOk(number){
    const s = String(number||'').replace(/\s+/g,'');
    if (s.length < 12) return false;
    let sum=0, alt=false;
    for (let i=s.length-1;i>=0;i--){ let n=+s[i]; if (alt){ n*=2; if (n>9) n-=9; } sum+=n; alt=!alt; }
    return sum%10===0;
  }

  if (num) num.addEventListener('input', function(){ this.value = fmtNumber(this.value); });
  if (exp) exp.addEventListener('input', function(){ this.value = fmtExp(this.value); });

  function validate(){
    let ok = true;
    const n = (num && num.value) || '';
    const e = (exp && exp.value) || '';
    const cc = (cvc && cvc.value) || '';
    const h = (holder && holder.value || '').trim();
    if (!luhnOk(n)) { document.getElementById('cardNumberError').textContent = 'Некорректный номер карты'; ok=false; } else { document.getElementById('cardNumberError').textContent=''; }
    if (!/^\d{2}\/\d{2}$/.test(e)) { document.getElementById('cardExpiryError').textContent = 'Введите срок MM/YY'; ok=false; } else { document.getElementById('cardExpiryError').textContent=''; }
    if (!/^\d{3,4}$/.test(cc)) { document.getElementById('cardCvcError').textContent = 'CVC 3-4 цифры'; ok=false; } else { document.getElementById('cardCvcError').textContent=''; }
    if (h.length < 2) { document.getElementById('cardHolderError').textContent = 'Укажите имя держателя'; ok=false; } else { document.getElementById('cardHolderError').textContent=''; }
    return ok;
  }

  if (closeBtn) closeBtn.addEventListener('click', closeCardPayModal);
  if (cardModal) cardModal.addEventListener('click', function(e){ if (e.target===cardModal) closeCardPayModal(); });
  if (cancelBtn) cancelBtn.addEventListener('click', function(e){ e.preventDefault(); closeCardPayModal(); });
  if (form) form.addEventListener('submit', function(e){
    e.preventDefault();
    if (!validate()) return;
    if (status) { status.style.color='#4ecdc4'; status.textContent='Обработка платежа...'; }
    const planName = (document.getElementById('cardPayModal').dataset.planName)||'';
    setTimeout(function(){
      try {
        const digits = (num && num.value ? String(num.value).replace(/\D+/g,'') : '');
        if (digits.length >= 12) { window._lastCardInfo = { brand: 'Mastercard', last4: digits.slice(-4) }; }
      } catch {}
      try { closeCardPayModal(); } catch {}
      if (planName) { try { purchasePlanFromDetails(planName, 'mastercard'); } catch {} }
      showToast && showToast('Оплата успешна');
    }, 1200);
  });
});

// Глобально
try { window.openCardPayModal = openCardPayModal; window.closeCardPayModal = closeCardPayModal; } catch {}

// Обработчик изменения валюты
document.addEventListener('DOMContentLoaded', function() {
  const currencySelect = document.getElementById('planCurrency');
  if (currencySelect) {
    currencySelect.addEventListener('change', async function() {
      const modal = document.getElementById('planDetailsModal');
      if (!modal) return;
      
      const basePrice = parseFloat(modal.dataset.basePrice || 0);
      const baseCurrency = modal.dataset.baseCurrency || 'BYN';
      const targetCurrency = this.value;
      
      await updatePlanPrice(basePrice, baseCurrency, targetCurrency, basePrice);
    });
  }
  
  // Обработчик кнопки покупки
  const purchaseBtn = document.getElementById('planDetailsPurchaseBtn');
  if (purchaseBtn) {
    purchaseBtn.addEventListener('click', function() {
      const modal = document.getElementById('planDetailsModal');
      if (!modal) return;
      
      const planName = modal.dataset.planName;
      if (!planName) return;
      
      // Получаем выбранный способ оплаты
      const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
      if (!selectedPaymentMethod) {
        showToast('Выберите способ оплаты');
        return;
      }
      
      // Проверяем валидность дат
      if (!validatePlanDates()) {
        showToast('Проверьте правильность выбранных дат');
        return;
      }
      
      const method = selectedPaymentMethod.value;
      if (method === 'mastercard') {
        // оплата картой через модалку
        openCardPayModal({ planName });
      } else {
        closePlanDetailsModal();
        purchasePlanFromDetails(planName, method);
      }
    });
  }
  
  // Обработчик выбора способа оплаты для включения/выключения кнопки оплаты
  const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
  paymentMethods.forEach(method => {
    method.addEventListener('change', function() {
      const purchaseBtn = document.getElementById('planDetailsPurchaseBtn');
      if (purchaseBtn) {
        purchaseBtn.disabled = !this.checked;
      }
    });
  });
  
  // Обработчик закрытия
  const closeBtn = document.querySelector('.plan-details-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closePlanDetailsModal);
  }
  
  // Закрытие при клике на фон модального окна
  const planModal = document.getElementById('planDetailsModal');
  if (planModal) {
    planModal.addEventListener('click', function(e) {
      if (e.target === planModal) {
        closePlanDetailsModal();
      }
    });
  }
});

// Функция для получения даты окончания последнего активного абонемента
function getNextPlanStartDate(user) {
  if (!user || !Array.isArray(user.plans) || user.plans.length === 0) {
    return new Date().toISOString();
  }
  
  const now = new Date();
  let latestExpiryDate = null;
  
  // Ищем самый поздний активный абонемент
  user.plans.forEach(plan => {
    if (plan.purchasedAt) {
      const purchaseDate = new Date(plan.purchasedAt);
      const duration = plan.duration || 30;
      const expiryDate = new Date(purchaseDate);
      expiryDate.setDate(expiryDate.getDate() + duration);
      
      // Если абонемент ещё активен или истек недавно, запоминаем его дату окончания
      const daysLeft = (expiryDate - now) / (1000 * 60 * 60 * 24);
      
      // Берём абонементы, которые либо активны, либо истекли не более чем неделю назад
      if (daysLeft > -7) {
        if (!latestExpiryDate || expiryDate > latestExpiryDate) {
          latestExpiryDate = expiryDate;
        }
      }
    }
  });
  
  // Если нашли активный абонемент, возвращаем дату его окончания
  // Иначе возвращаем текущую дату
  return latestExpiryDate && latestExpiryDate > now 
    ? latestExpiryDate.toISOString() 
    : new Date().toISOString();
}

// Функция покупки из детального окна
function purchasePlanFromDetails(planName, paymentMethod = 'unknown') {
  // Проверяем, не нажимается ли кнопка повторно
  const user = getCurrentUser();
  if (!user) {
    showToast('Чтобы купить абонемент, войдите в аккаунт');
    return;
  }
  if (!isEmailVerified(user)) {
    showToast('Подтвердите e‑mail через ссылку в письме, чтобы покупать абонементы');
    return;
  }
  
  // Проверяем, есть ли уже такой абонемент у пользователя
  if (isPlanAlreadyOwned(planName)) {
    showAlreadyOwnedMessage(planName);
    return;
  }
  
  // Находим карточку для анимации
  const cards = document.querySelectorAll('#abonements-section .trainer-card');
  let targetCard = null;
  for (const card of cards) {
    const cardTitle = card.querySelector('h3');
    if (cardTitle && cardTitle.textContent === planName) {
      targetCard = card;
      break;
    }
  }
  
  // Добавляем абонемент
  const modal = document.getElementById('planDetailsModal');
  const plans = Array.isArray(user.plans) ? user.plans : [];
  
  // Определяем название метода оплаты
  const paymentMethodNames = {
    'mastercard': 'Mastercard',
    'paypal': 'PayPal',
    'googlepay': 'Google Pay',
    'unknown': 'неизвестен'
  };
  const paymentMethodName = paymentMethodNames[paymentMethod] || 'неизвестен';
  const modalDuration = modal ? parseInt(modal.dataset.duration) : null;
  const modalType = modal ? (modal.dataset.planType || '') : '';
  
  // Получаем выбранную пользователем дату начала и считаем конец автоматически
  const startDateInput = document.getElementById('planStartDate');
  const endDateInput = document.getElementById('planEndDate');
  let planStartDate, planEndDate, duration;
  const durationDefault = modalDuration || 30;
  if (startDateInput && startDateInput.value) {
    planStartDate = startDateInput.value;
    const start = new Date(planStartDate);
    duration = durationDefault;
    const end = new Date(start);
    end.setDate(end.getDate() + duration);
    planEndDate = end.toISOString().split('T')[0];
    if (endDateInput) endDateInput.value = planEndDate;
  } else {
    planStartDate = getNextPlanStartDate(user);
    duration = durationDefault;
    const start = new Date(planStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + duration);
    planEndDate = end.toISOString().split('T')[0];
  }
  
  const plan = { 
    title: planName, 
    price: modal ? modal.dataset.originalPrice || '' : '',
    purchasedAt: planStartDate, // Дата начала абонемента
    duration: duration, // Длительность в днях
    paymentMethod: paymentMethod || 'unknown', // Сохраняем способ оплаты
    endDate: planEndDate || null, // Дата окончания (если выбрана пользователем)
    type: modalType || undefined
  };
  // Добавим данные карты, если оплата картой
  try {
    if ((paymentMethod||'') === 'mastercard' && window._lastCardInfo) {
      plan.cardBrand = window._lastCardInfo.brand || 'Mastercard';
      plan.cardLast4 = window._lastCardInfo.last4 || '';
      window._lastCardInfo = null;
    }
  } catch {}
  plans.push(plan);
  user.plans = plans;
  setCurrentUser(user);
  
  // Обновляем список пользователей
  const users = readUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) { 
    users[idx].plans = plans; 
    writeUsers(users); 
  }
  
  // Обновляем профиль
  if (typeof renderUserPlans === 'function') {
    renderUserPlans();
  }
  
  // Сохраняем в Supabase
  try { 
    if (typeof savePlanToSupabase === 'function') {
      savePlanToSupabase({ user, planTitle: planName }).then(() => {}); 
    }
  } catch {}
  
  // Создаем частицы
  if (targetCard) {
    createParticles(targetCard);
    targetCard.style.animation = 'purchaseShake 0.8s ease-in-out';
  }
  
  // Звуковой эффект
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBS13yO+eizEIHWq+8+OWT');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch (e) {}
  
  // Показываем уведомление
  const startDate = new Date(planStartDate);
  const now = new Date();
  const isFuture = startDate > now;
  
  let toastMessage = `Абонемент "${planName}" успешно приобретен через ${paymentMethodName}!`;
  
  if (planEndDate) {
    const startDateStr = startDate.toLocaleDateString('ru-RU');
    const endDateStr = new Date(planEndDate).toLocaleDateString('ru-RU');
    toastMessage += ` Период действия: ${startDateStr} - ${endDateStr}.`;
  } else if (isFuture) {
    const startDateStr = startDate.toLocaleDateString('ru-RU');
    toastMessage += ` Абонемент начнётся ${startDateStr}.`;
  }
  
  showToast(toastMessage);
  
  // Обновляем внешний вид кнопок
  if (typeof updateButtonAppearance === 'function') {
    updateButtonAppearance();
  }
}

// ЭПИЧНАЯ АНИМАЦИЯ ПОКУПКИ
function purchasePlan(planName) {
  // Проверяем, не нажимается ли кнопка повторно
  const user = getCurrentUser();
  if (!user) {
    showToast('Чтобы купить абонемент, войдите в аккаунт');
    return;
  }
  if (!isEmailVerified(user)) {
    showToast('Подтвердите e‑mail через ссылку в письме, чтобы покупать абонементы');
    return;
  }
  
  // Проверяем, есть ли уже такой абонемент у пользователя
  if (isPlanAlreadyOwned(planName)) {
    showAlreadyOwnedMessage(planName);
    return;
  }
  
  // Проверяем, есть ли у нас данные об абонементе
  const cards = document.querySelectorAll('#abonements-section .trainer-card');
  let targetCard = null;
  let description = '';
  let priceText = '';
  let extraInfo = null;
  
  for (const card of cards) {
    const cardTitle = card.querySelector('h3');
    if (cardTitle && cardTitle.textContent === planName) {
      targetCard = card;
      // Получаем все p теги кроме .plan-price
      const allPElements = card.querySelectorAll('p:not(.plan-price)');
      description = Array.from(allPElements).map(p => p.textContent).join('\n');
      const priceEl = card.querySelector('.plan-price');
      priceText = priceEl ? priceEl.textContent : '';
      
      // Получаем дополнительные данные из dataset
      extraInfo = {
        duration: card.dataset.duration || null,
        type: card.dataset.type || null,
        access: card.dataset.access || null,
        gyms: card.dataset.gyms ? JSON.parse(card.dataset.gyms) : null
      };
      break;
    }
  }
  
  // ОТКРЫВАЕМ МОДАЛЬНОЕ ОКНО С ДЕТАЛЬНОЙ ИНФОРМАЦИЕЙ
  openPlanDetails(planName, description, priceText, extraInfo);
}

function createParticles(container) {
  const rect = container.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = centerX + 'px';
    particle.style.top = centerY + 'px';
    particle.style.background = `hsl(${Math.random() * 60 + 30}, 100%, 50%)`;
    
    // Случайное направление
    const angle = (Math.PI * 2 * i) / 20;
    const distance = 50 + Math.random() * 100;
    const endX = centerX + Math.cos(angle) * distance;
    const endY = centerY + Math.sin(angle) * distance;
    
    particle.style.setProperty('--end-x', endX + 'px');
    particle.style.setProperty('--end-y', endY + 'px');
    
    document.body.appendChild(particle);
    
    // Удаляем частицу после анимации
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    }, 1500);
  }
}

function showButtonSuccessAnimation(button, planName) {
  // Красивая анимация мигания кнопки
  button.textContent = '✓ КУПЛЕНО!';
  button.style.background = 'linear-gradient(45deg, #4ecdc4, #44a08d, #4ecdc4)';
  button.style.backgroundSize = '200% 200%';
  button.style.animation = 'buttonSuccessPulse 2s ease-in-out, buttonSuccessGlow 3s ease-in-out';
  button.style.color = '#fff';
  button.style.fontWeight = 'bold';
  button.style.boxShadow = '0 0 20px rgba(78, 205, 196, 0.8)';
  
  // Показываем уведомление
  showToast(`Абонемент "${planName}" успешно приобретен!`);
  
  // Возвращаем кнопку в исходное состояние через 3 секунды
  setTimeout(() => {
    button.textContent = '✓ Уже есть';
    button.style.background = '#4ecdc4';
    button.style.animation = 'pulseGreen 2s infinite';
    button.style.boxShadow = '0 0 0 0 rgba(78, 205, 196, 0.7)';
  }, 3000);
}

function closePurchaseSuccess() {
  // Функция оставлена для совместимости, но больше не используется
  console.log('Модальное окно покупки больше не используется');
}

function resetPurchaseAnimation(button, card) {
  setTimeout(() => {
    button.classList.remove('purchasing');
    card.style.animation = '';
    
    // Устанавливаем кнопку в состояние "куплено"
    button.textContent = '✓ Уже есть';
    button.style.background = '#4ecdc4';
    button.style.color = 'white';
    button.style.cursor = 'not-allowed';
    button.disabled = true;
  }, 2000);
}

// Проверка, есть ли уже такой абонемент у пользователя
function isPlanAlreadyOwned(planName) {
  try {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) return false;
    
    const user = JSON.parse(userJson);
    if (!user.plans || !Array.isArray(user.plans)) return false;
    
    const now = new Date();
    
    return user.plans.some(plan => {
      // Проверяем название
      const nameMatches = plan.title === planName || 
                         plan.name === planName ||
                         plan.planName === planName;
      
      if (!nameMatches) return false;
      
      // Если есть дата покупки, проверяем, активен ли абонемент
      if (plan.purchasedAt) {
        const purchaseDate = new Date(plan.purchasedAt);
        const duration = plan.duration || 30;
        const expiryDate = new Date(purchaseDate);
        expiryDate.setDate(expiryDate.getDate() + duration);
        
        // Абонемент считается активным, если ещё не истек
        // Даём небольшую льготу (7 дней после истечения)
        const daysLeft = (expiryDate - now) / (1000 * 60 * 60 * 24);
        return daysLeft > -7;
      }
      
      return true;
    });
  } catch (e) {
    console.warn('Ошибка проверки абонементов:', e);
    return false;
  }
}

// Делаем функцию доступной глобально
window.isPlanAlreadyOwned = isPlanAlreadyOwned;

// Переменная для отслеживания активных уведомлений
let activeNotification = null;

// Показ сообщения о том, что абонемент уже есть
function showAlreadyOwnedMessage(planName) {
  // Удаляем предыдущее уведомление, если оно есть
  if (activeNotification && activeNotification.parentNode) {
    activeNotification.parentNode.removeChild(activeNotification);
  }
  
  // Создаем простое уведомление без анимации
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff6b6b;
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(255, 107, 107, 0.3);
    z-index: 2000;
    font-weight: 600;
    font-size: 1rem;
    max-width: 300px;
    animation: slideInRight 0.3s ease-out;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 1.5rem;">⚠️</span>
      <div>
        <div style="font-weight: bold;">Абонемент уже есть!</div>
        <div style="font-size: 0.9rem; opacity: 0.9;">${planName}</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  activeNotification = notification;
  
  // Удаляем уведомление через 3 секунды
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
          activeNotification = null;
        }
      }, 300);
    }
  }, 3000);
}

// Обновление внешнего вида кнопок для уже купленных абонементов
function updateButtonAppearance() {
  const buttons = document.querySelectorAll('#abonements-section .plan-button');
  buttons.forEach(button => {
    const card = button.closest('.trainer-card');
    const planName = card.querySelector('h3').textContent;
    
    if (isPlanAlreadyOwned(planName)) {
      button.textContent = '✓ Уже есть';
      button.style.background = '#4ecdc4';
      button.style.color = 'white';
      button.style.cursor = 'not-allowed';
      button.disabled = true;
    } else {
      button.textContent = 'Выбрать';
      button.style.background = '#ffcc00';
      button.style.color = '#000';
      button.style.cursor = 'pointer';
      button.disabled = false;
    }
  });
}

// Делаем функцию доступной глобально
window.updateButtonAppearance = updateButtonAppearance;

// Добавляем обработчики для статических кнопок
document.addEventListener('DOMContentLoaded', function() {
  // Обработчики для статических кнопок в HTML
  const staticButtons = document.querySelectorAll('#abonements-section .plan-button');
  staticButtons.forEach(button => {
    // Удаляем старый обработчик, если он есть
    button.removeEventListener('click', handleStaticButtonClick);
    // Добавляем новый обработчик
    button.addEventListener('click', handleStaticButtonClick);
  });
  
  // Обновляем внешний вид кнопок при загрузке
  updateButtonAppearance();
});

// Обработчик для статических кнопок
function handleStaticButtonClick(event) {
  const card = event.target.closest('.trainer-card');
  const planName = card.querySelector('h3').textContent;
  purchasePlan(planName);
}

// Функция для обновления секции абонементов на сайте
function updateAbonementsSection() {
  console.log('[updateAbonementsSection] Starting to update abonements section...');
  
  // Вызываем существующую функцию загрузки планов из Supabase
  if (typeof loadPlansFromSupabase === 'function') {
    loadPlansFromSupabase();
  }
}

// Делаем функцию доступной глобально
window.updateAbonementsSection = updateAbonementsSection;
