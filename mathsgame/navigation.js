'use strict';
(() => {
  const search = document.querySelector('#section-search');
  const links = [...document.querySelectorAll('#section-links a')];
  search?.addEventListener('input', () => {
    const needle = search.value.trim().toLocaleLowerCase();
    links.forEach(link => { link.hidden = !link.textContent.toLocaleLowerCase().includes(needle); });
  });
  function markCurrent() {
    const selected = location.hash || '#overview';
    links.forEach(link => {
      if (link.getAttribute('href') === selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange', markCurrent);
  markCurrent();
})();
