document.addEventListener('DOMContentLoaded', function() {
  const aboutLink = document.querySelector('a[href="#about"]');
  const aboutSection = document.getElementById('about-section');
  const mainContent = document.getElementById('content');

  function openAboutSection() {
    if (!aboutSection || !mainContent) return;
    // Анимация «взлёта» кнопки в меню
    try {
      if (aboutLink) {
        aboutLink.classList.add('liftoff');
        setTimeout(() => { aboutLink.classList.remove('liftoff'); }, 700);
      }
    } catch {}
    // Запускаем открытие секции с небольшой задержкой для эффекта
    setTimeout(() => {
      mainContent.classList.add('hidden-content');
      aboutSection.classList.remove('hidden');
      setTimeout(() => { aboutSection.classList.add('active'); }, 10);
      setTimeout(() => { mainContent.style.display = 'none'; }, 600);
      document.body.classList.add('section-open');
      // прокрутка к началу секции
      try { aboutSection.scrollTo({ top: 0, behavior: 'instant' }); } catch {}
      try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch {}
    }, 180);
  }

  if (aboutLink && aboutSection && mainContent) {
    aboutLink.addEventListener('click', function(e) {
      e.preventDefault();
      openAboutSection();
      try { location.hash = '#about'; } catch {}
    });
  }

  // Открытие по хэшу при загрузке
  try { if (location.hash === '#about') { openAboutSection(); } } catch {}
  // Реакция на смену хэша
  window.addEventListener('hashchange', function() {
    try {
      if (location.hash === '#about') { openAboutSection(); }
    } catch {}
  });
});

function closeAbout() {
  const aboutSection = document.getElementById('about-section');
  const mainContent = document.getElementById('content');
  if (!aboutSection || !mainContent) return;
  mainContent.style.display = '';
  // запустим анимацию закрытия
  aboutSection.classList.remove('active');
  aboutSection.classList.add('about-closing');
  setTimeout(() => {
    aboutSection.classList.add('hidden');
    aboutSection.classList.remove('about-closing');
    mainContent.classList.remove('hidden-content');
    document.body.classList.remove('section-open');
    try { history.pushState('', document.title, window.location.pathname + window.location.search); } catch {}
  }, 480);
}

