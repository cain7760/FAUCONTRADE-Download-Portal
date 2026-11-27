import { copy } from './portal-copy.js';
import { bindLoginDialog, demoAccountKey, renderLoginDialog } from './login-dialog.js';
import { renderHome, renderGuestHome, bindHome } from './home.js';
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
let openLogin;

function hasCustomerSession() {
  try {
    return Boolean(sessionStorage.getItem(demoAccountKey)?.trim());
  } catch {
    return false;
  }
}

function renderHeader(t, guest) {
  return `
    <a class="skip-link" href="#main-content">${t.skip}</a>
    <header class="site-header">
      <div class="wrap nav-shell">
        <a class="brand" href="#home" aria-label="FAUCON TRADE">
          <img src="assets/customer-brand-dark.svg" width="953" height="277" alt="">
        </a>
        ${guest
          ? ''
          : `<nav class="site-nav" aria-label="${t.footer}">
              ${sections.map((section, index) => `<a href="#${section}">${t.nav[index]}</a>`).join('')}
            </nav>`}
        <div class="language-control">${renderLanguageMenu(language, t.languageLabel)}</div>
      </div>
    </header>`;
}

function readRoute() {
  const hash = location.hash.slice(1);
  if (!hasCustomerSession()) {
    if (!['', 'home', 'main-content'].includes(hash)) {
      const url = new URL(location.href);
      url.hash = '';
      history.replaceState(history.state, '', url);
      return { key: 'guest', entry: 'home' };
    }
    return { key: 'guest', entry: hash || 'home' };
  }
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
  const guest = route.key === 'guest';
  document.documentElement.lang = language;
  document.documentElement.classList.toggle('portal-guest', guest);
  document.documentElement.classList.toggle('portal-manual', Boolean(route.chapter));
  document.title = `FAUCON TRADE · ${route.chapter ? t.manualTitle : t.footer}`;
  if (route.key !== renderedRoute || preserveScroll) {
    releaseHome?.();
    let content;
    if (guest) content = renderGuestHome(t);
    else if (route.chapter) content = renderManual(t, route.chapter, faqDestinations);
    else content = renderHome(t, faqDestinations);
    app.innerHTML = renderHeader(t, guest) + content + (guest ? renderLoginDialog(t.loginDialog) : '');
    openLogin = guest ? bindLoginDialog(app.querySelector('#portal-login-dialog'), t.loginDialog, showMemberPortal) : undefined;
    releaseHome = route.chapter ? undefined : bindHome(app.querySelector('main'), t);
    renderedRoute = route.key;
  }
  app.querySelectorAll('.site-nav a').forEach(link => {
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

function showMemberPortal() {
  const url = new URL(location.href);
  url.hash = '';
  history.replaceState(history.state, '', url);
  render();

  requestAnimationFrame(() => app.querySelector('main').focus({preventScroll: true}));
}

app.addEventListener('click', event => {
  const loginTrigger = event.target.closest('[data-portal-login]');
  if (loginTrigger) {
    openLogin?.(loginTrigger);
    return;
  }
  const menuLink = event.target.closest('.site-nav a');
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
window.addEventListener('pageshow', event => {
  if (event.persisted && readRoute().key !== renderedRoute) render();
});
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
