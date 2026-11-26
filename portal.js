import { copy } from './portal-copy.js';
import { renderHome, bindHome } from './home.js';
import { renderManual } from './manual.js';
import { renderLanguageMenu, bindLanguageMenu, resolveLanguage } from './language-menu.js';

const app = document.querySelector('#app');
const sections = ['products', 'flow', 'terminals', 'help', 'contact'];
const faqDestinations = [
  ['support', 'overnight-funds'],
  ['support', 'amend-cancel'],
  ['status', 'orders-and-fills'],
  ['start', 'installation-help'],
];
const requestedLanguage = new URLSearchParams(location.search).get('lang');
let language = resolveLanguage(requestedLanguage);
let renderedRoute = '';
let releaseHome;

function hasCustomerSession() {
  try {
    return Boolean(sessionStorage.getItem('faucon-demo-login-account')?.trim());
  } catch {
    return false;
  }
}

function portalLoginHref() {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const login = local
    ? new URL(location.origin)
    : new URL('https://cain7760.github.io/FAUCONTRADE-Customer-PC/login.html');
  if (local) {
    login.port = '4177';
    login.pathname = '/login.html';
  }
  login.searchParams.set('from', 'portal');
  login.searchParams.set('lang', language);
  return login.href;
}

function renderHeader(t) {
  return `
    <a class="skip-link" href="#main-content">${t.skip}</a>
    <header class="site-header">
      <div class="wrap nav-shell">
        <a class="brand" href="#home" aria-label="FAUCON TRADE">
          <img src="assets/customer-brand-dark.svg" width="953" height="277" alt="">
        </a>
        <nav class="site-nav" aria-label="${t.footer}">
          ${sections.map((section,index) => `<a href="#${section}">${t.nav[index]}</a>`).join('')}
          ${hasCustomerSession() ? '' : `<a class="portal-login" href="${portalLoginHref()}">${t.portalLogin}</a>`}
        </nav>
        <div class="language-control">${renderLanguageMenu(language, t.languageLabel)}</div>
      </div>
    </header>`;
}

function readRoute() {
  const hash = location.hash.slice(1);
  if (hash.startsWith('/manual/')) {
    const [, , chapter, entry] = hash.split('/');
    return { key: 'manual:' + chapter, chapter, entry };
  }
  return { key:'home', entry:hash || 'home' };
}

function scrollToMenuSection(target) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    target.scrollIntoView({ block: 'start', behavior: 'instant' });
    return;
  }
  // For distant sections, animate only the arrival so intervening sections do not flash past.
  const headerHeight = app.querySelector('.site-header').offsetHeight;
  const limit = document.documentElement.scrollHeight - window.innerHeight;
  const top = Math.max(0, Math.min(limit, window.scrollY + target.getBoundingClientRect().top - headerHeight));
  const distance = top - window.scrollY;
  const arrival = 128;
  if (Math.abs(distance) > arrival) {
    window.scrollTo({ top: top - Math.sign(distance) * arrival, behavior: 'instant' });
  }
  window.scrollTo({ top, behavior: 'smooth' });
}

function render({ preserveScroll = false, menuClick = false, keyboard = false } = {}) {
  const t = copy[language];
  const route = readRoute();
  const previousScroll = window.scrollY;
  document.documentElement.lang = language;
  document.documentElement.classList.toggle('portal-manual', Boolean(route.chapter));
  document.title = `FAUCON TRADE · ${route.chapter ? t.manualTitle : t.footer}`;
  if (route.key !== renderedRoute || preserveScroll) {
    releaseHome?.();
    app.innerHTML = renderHeader(t) + (route.chapter ? renderManual(t, route.chapter, faqDestinations) : renderHome(t, faqDestinations));
    releaseHome = route.chapter ? undefined : bindHome(app.querySelector('main'), t);
    renderedRoute = route.key;
  }
  app.querySelectorAll('.site-nav a[href^="#"]').forEach(link => {
    if (link.hash === location.hash) link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  });
  requestAnimationFrame(() => {
    if (preserveScroll) {
      window.scrollTo({ top:previousScroll, behavior:'instant' });
      app.querySelector('.language').focus({ preventScroll:true });
      return;
    }
    const target = route.entry ? document.getElementById(route.entry) : null;
    if (target && menuClick) {
      if (keyboard) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
      scrollToMenuSection(target);
    } else if (target) {
      target.scrollIntoView({ block:'start', behavior:'instant' });
      if (route.chapter || route.entry === 'main-content') target.focus({ preventScroll:true });
    } else {
      window.scrollTo({ top:0, behavior:'instant' });
    }
  });
}

app.addEventListener('click', event => {
  const menuLink = event.target.closest('.site-nav a[href^="#"]');
  if (menuLink && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
    event.preventDefault();
    if (menuLink.hash !== location.hash) history.pushState(null, '', menuLink.href);
    render({ menuClick: true, keyboard: event.detail === 0 });
    return;
  }
  if (event.target.closest('.skip-link')) {
    event.preventDefault();
    const content = document.querySelector('#main-content');
    content.focus({ preventScroll:true });
    content.scrollIntoView({ block:'start', behavior:'instant' });
    return;
  }
  if (event.target.closest('[data-action="print"]')) window.print();
});

bindLanguageMenu(selected => {
  language = selected;
  const url = new URL(location.href);
  url.searchParams.set('lang', language);
  history.replaceState(null, '', url);
  render({ preserveScroll:true });
});

app.addEventListener('input', event => {
  if (event.target.id !== 'manual-search') return;
  const query = event.target.value.trim().toLocaleLowerCase();
  const links = [...app.querySelectorAll('.chapter-list a')];
  links.forEach(link => { link.hidden = !link.textContent.toLocaleLowerCase().includes(query); });
  document.querySelector('#no-result').hidden = links.some(link => !link.hidden);
});

window.addEventListener('hashchange', () => render());
render();

// WebKit supports round() for lengths, but cannot yet round an intrinsic label width in CSS.
if (!CSS.supports('inline-size', 'calc-size(max-content, round(up, size, 1px))')) {
  const selector = '.site-nav a, .language, .scene-choices button, .product-tabs button, .manual-actions button, .skip-link, .guide-link, .contact-methods > div, .benefit-heading h2, .journey-heading h4, .terminal-action span, .manual-actions a';
  let pending = 0;
  function roundControls() {
    pending = 0;
    const controls = [...app.querySelectorAll(selector)];
    // Measure natural layout as a batch, including local font, padding, and the active translation.
    controls.forEach(control => control.style.removeProperty('inline-size'));
    const widths = controls.map(control => Math.ceil(parseFloat(getComputedStyle(control).inlineSize)));
    controls.forEach((control, index) => {
      if (widths[index] > 0) control.style.inlineSize = widths[index] + 'px';
    });
  }
  function scheduleRounding() {
    if (!pending) pending = requestAnimationFrame(roundControls);
  }
  new MutationObserver(scheduleRounding).observe(app, {
    subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'],
  });
  window.addEventListener('resize', scheduleRounding);
  document.fonts.addEventListener('loadingdone', scheduleRounding);
  document.fonts.ready.then(scheduleRounding);
  roundControls();
}
