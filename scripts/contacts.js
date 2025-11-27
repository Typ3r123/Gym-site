document.addEventListener('DOMContentLoaded', function() {
  const contactsLink = document.querySelector('a[href="#contacts"]');
  const contactsSection = document.getElementById('contacts-section');
  const mainContent = document.getElementById('content');
  let mapInited = false;
  window.contactsMap = null;
  let contactsCardsObserver = null;

  function setupContactsCardsObserver() {
    try {
      const cards = document.querySelectorAll('.contact-info-card');
      if (!cards || !cards.length) return;
      // Сбросить прошлую анимацию и старый observer
      cards.forEach(c => c.classList.remove('in-view'));
      if (contactsCardsObserver) { try { contactsCardsObserver.disconnect(); } catch {} }
      contactsCardsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            contactsCardsObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      cards.forEach(card => contactsCardsObserver.observe(card));
    } catch {}
  }

  if (contactsLink && contactsSection && mainContent) {
    contactsLink.addEventListener('click', function(e) {
      e.preventDefault();
      mainContent.classList.add('hidden-content');
      contactsSection.classList.remove('hidden');
      setTimeout(() => { contactsSection.classList.add('active'); }, 10);
      setTimeout(() => { mainContent.style.display = 'none'; }, 600);
      document.body.classList.add('section-open');
      // Переинициализировать анимацию карточек при каждом открытии
      setTimeout(() => setupContactsCardsObserver(), 50);

      if (!mapInited && window.ymaps) {
        ymaps.ready(initContactsMap);
        mapInited = true;
      }
      setTimeout(() => {
        if (window.contactsMap) {
          try { window.contactsMap.container.fitToViewport(); } catch (e) {}
        }
      }, 700);
    });
  }

  // Инициализация анимации карточек на первой загрузке
  setupContactsCardsObserver();

  // Клик по зелёной кнопке "Выбрать абонемент" на карточках контактов
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.contact-card-btn');
    if (!btn) return;
    e.preventDefault();
    if (typeof window.openAbonementsSection === 'function') {
      window.openAbonementsSection();
    } else {
      // Фоллбек: эмулируем клик по пункту меню Абонементы
      const navLink = document.querySelector('a[href="#abonements"]');
      if (navLink) navLink.click();
    }
  });
});

function initContactsMap() {
  const coords = [53.908665, 27.557535];
  const map = new ymaps.Map('map', {
    center: coords,
    zoom: 16,
    controls: ['zoomControl', 'fullscreenControl']
  });
  window.contactsMap = map;

  // Круглая иконка с картинкой из папки Images
  const circleLayout = ymaps.templateLayoutFactory.createClass(
    '<div style="width:44px;height:44px;border-radius:50%;overflow:hidden;border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.25);background:#fff;">'
    + '<div style="width:100%;height:100%;background-size:cover;background-position:center;background-image:url($[properties.iconImage]);"></div>'
    + '</div>'
  );

  const gymIcon = new ymaps.Placemark(coords, {
    hintContent: 'PurePulse — тренажёрный зал',
    balloonContent: '<strong>PurePulse</strong><br>просп. Победителей, 7А',
    iconImage: 'images/gantel.png'
  }, {
    iconLayout: circleLayout,
    iconShape: { type: 'Circle', coordinates: [22, 22], radius: 22 },
    iconOffset: [-22, -22]
  });

  const prityckogoCoords = [53.9026, 27.4446];
  const gymIcon2 = new ymaps.Placemark(prityckogoCoords, {
    hintContent: 'PurePulse — Притыцкого, 156',
    balloonContent: '<strong>PurePulse</strong><br>ул. Притыцкого, 156',
    iconImage: 'images/gantel2.png'
  }, {
    iconLayout: circleLayout,
    iconShape: { type: 'Circle', coordinates: [22, 22], radius: 22 },
    iconOffset: [-22, -22]
  });

  map.geoObjects.add(gymIcon);
  map.geoObjects.add(gymIcon2);
  try { map.container.fitToViewport(); } catch (e) {}
}

window.addEventListener('resize', function() {
  if (window.contactsMap) {
    try { window.contactsMap.container.fitToViewport(); } catch (e) {}
  }
});

function closeContacts() {
  const contactsSection = document.getElementById('contacts-section');
  const mainContent = document.getElementById('content');
  if (!contactsSection || !mainContent) return;
  mainContent.style.display = '';
  contactsSection.classList.remove('active');
  setTimeout(() => {
    contactsSection.classList.add('hidden');
    mainContent.classList.remove('hidden-content');
    document.body.classList.remove('section-open');
    // Сбросить состояние карточек при закрытии, чтобы в следующий раз анимация повторилась
    try { document.querySelectorAll('.contact-info-card').forEach(c => c.classList.remove('in-view')); } catch {}
  }, 600);
}


