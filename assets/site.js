// Kombra Group homepage: hash routes (#home, #ventures, #services, #work, #about, #contact)
// and the mobile menu. No inline handlers, so the Content-Security-Policy can stay script-src 'self'.
(function () {
  var doc = document.documentElement;
  doc.classList.add('js');
  var pages = ['home', 'ventures', 'services', 'work', 'about', 'contact'];
  var links = document.getElementById('nav-links');
  var btn = document.querySelector('.menu-btn');

  function closeMenu() {
    if (!links || !btn) return;
    links.classList.remove('open');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open navigation');
  }

  function show(id, scroll) {
    if (pages.indexOf(id) === -1) id = 'home';
    document.querySelectorAll('.page').forEach(function (p) {
      p.classList.toggle('active', p.id === 'page-' + id);
    });
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      var on = a.getAttribute('data-page') === id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    closeMenu();
    if (scroll) window.scrollTo(0, 0);
  }

  function fromHash() {
    show((location.hash || '#home').slice(1), true);
  }

  if (btn && links) {
    btn.addEventListener('click', function () {
      var open = !links.classList.contains('open');
      links.classList.toggle('open', open);
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
  }
  window.addEventListener('hashchange', fromHash);
  show((location.hash || '#home').slice(1), false);
})();
