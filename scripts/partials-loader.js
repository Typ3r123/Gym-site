(async function() {
  // Helper to load HTML partials into elements with data-include
  async function loadPartials() {
    const placeholders = Array.from(document.querySelectorAll('[data-include]'));
    await Promise.all(placeholders.map(async (el) => {
      const url = el.getAttribute('data-include');
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        const html = await res.text();
        const wrap = document.createElement('div');
        wrap.innerHTML = html;
        // Move children in place (preserve outer)
        const frag = document.createDocumentFragment();
        while (wrap.firstChild) frag.appendChild(wrap.firstChild);
        el.replaceWith(frag);
      } catch (e) { console.warn('[partials] load failed', url, e); }
    }));
  }

  // Sequentially load scripts preserving order
  async function loadScript(src, isModule) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      if (isModule) s.type = 'module';
      s.src = src;
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.body.appendChild(s);
    });
  }

  // Patch: capture DOMContentLoaded listeners added after DOM already loaded
  const origAdd = document.addEventListener.bind(document);
  const domReadyCallbacks = [];
  document.addEventListener = function(type, listener, options) {
    if (type === 'DOMContentLoaded' && document.readyState !== 'loading') {
      domReadyCallbacks.push(listener);
      return;
    }
    return origAdd(type, listener, options);
  };

  // Supabase init (the values from previous inline script)
  function initSupabase() {
    try {
      if (!window.supabase || !window.supabase.createClient) return;
      window.supabase = window.supabase.createClient(
        'https://ufskzvdcursjxzvwwmek.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmc2t6dmRjdXJzanh6dnd3bWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NDkxNTcsImV4cCI6MjA3NTMyNTE1N30.HMdwmeIgT1ZDvlYc2zGUBLHIFkbktPAWEsAX1twylZA'
      );
    } catch (e) { console.warn('[partials] supabase init failed', e); }
  }

  // Run loader
  try {
    await loadPartials();
  } finally {
    // After partials are in DOM, load third-party and app scripts in order
    const queue = [
      'https://api-maps.yandex.ru/2.1/?lang=ru_RU',
      'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.4/gsap.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.4/EasePack.min.js',
      'https://unpkg.com/@supabase/supabase-js@2',
    ];
    for (const src of queue) { await loadScript(src); }
    initSupabase();
    const appQueue = [
      'scripts/utils.js',
      'scripts/functional.js',
      'scripts/admin.js',
      'scripts/manager.js',
      'scripts/contacts.js',
      'scripts/abonements.js',
      'scripts/profile.js',
      'scripts/trainers.js',
      'scripts/about.js'
    ];
    for (const src of appQueue) { await loadScript(src); }

    // Manually invoke captured DOMContentLoaded callbacks
    try {
      const evt = new Event('DOMContentLoaded');
      domReadyCallbacks.forEach((cb) => {
        try { cb.call(document, evt); } catch (e) { console.warn('DOMReady cb error', e); }
      });
    } catch {}

    try { document.dispatchEvent(new Event('partials:loaded')); } catch {}
    window.partialsReady = Promise.resolve();
  }
})();


