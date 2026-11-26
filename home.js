import { observeSize, observeVisibility } from './layout-observers.js';
import { horizontalChoiceIndex } from './choice-navigation.js';
import { renderHero, bindHero } from './hero-scenes.js';
import { renderDestinations, renderTerminals } from './destinations.js';

const walkthroughs = [
  'assets/customer-buy-demo-pov-v2',
  'assets/customer-amend-demo-v2',
  'assets/customer-close-demo',
];
let activeProduct = 0;

function renderOverview(t) {
  const marks = ['positions', 'intervals', 'access'];
  return `<section class="overview-band" aria-label="${t.overview}">
    <div class="wrap benefit-grid">
      ${t.experiences.map(([title, detail], i) => `<article class="benefit">
        <div class="benefit-heading"><i class="mark mark-${marks[i]}" aria-hidden="true"></i><h2>${title}</h2></div>
        <p>${detail}</p>
      </article>`).join('')}
    </div>
  </section>`;
}

// Paragraphs share a wrapping width, but their longest rendered lines can differ.
function alignOverviewContent(grid) {
  if (!matchMedia('(min-width: 981px)').matches) return;
  const bounds = grid.getBoundingClientRect();
  const range = document.createRange();
  const cards = [...grid.children];
  const [firstWidth, middleWidth, lastWidth] = cards.map(card => {
    range.selectNodeContents(card.querySelector('h2'));
    const titleWidth = range.getBoundingClientRect().right - card.querySelector('.mark').getBoundingClientRect().left;
    range.selectNodeContents(card.querySelector('p'));
    return Math.max(titleWidth, range.getBoundingClientRect().width);
  });
  const freeWidth = bounds.width - firstWidth - middleWidth - lastWidth;
  const existingGap = Math.min(96, freeWidth / 3);
  const extraGap = Math.min(20, Math.max(0, freeWidth / 2 - existingGap));
  const gap = existingGap + extraGap;
  const middleLeft = bounds.left + firstWidth + gap;
  const middleOffset = middleLeft - cards[1].getBoundingClientRect().left;
  const lastOffset = middleLeft + middleWidth + gap - cards[2].getBoundingClientRect().left;
  cards[1].style.setProperty('--benefit-offset', Math.round(middleOffset) + 'px');
  cards[2].style.setProperty('--benefit-offset', Math.round(lastOffset) + 'px');
}

function renderJourney(product) {
  return `<ol class="execution-steps" role="list">
      ${product.features.map((title, step) => `<li>
        <div class="journey-heading">
          <span class="journey-number" aria-hidden="true">${String(step + 1).padStart(2, '0')}</span>
          <h4>${title}</h4>
        </div>
        <p>${product.details[step]}</p>
      </li>`).join('')}
    </ol>`;
}

function renderPanel(product, index) {
  const isTrs = index === 0;
  return `<article role="tabpanel" aria-labelledby="product-tab-${index}" id="product-panel-${index}" class="product-panel" tabindex="0" ${index === activeProduct ? '' : 'hidden'}>
    <div class="execution-panel">
      <div class="product-caption">
        <h3>${product.promise}</h3>
        <p>${product.text}</p>
      </div>
      ${renderJourney(product)}
    </div>
    <div class="guide-align"><a class="guide-link chapter-guide" href="#/manual/${isTrs ? 'trs' : 'options'}">${product.link}<span aria-hidden="true">↗</span></a></div>
  </article>`;
}

function renderTabs(id, heading, labels, selected, className = 'product-tabs') {
  return `<div class="${className}" role="tablist" aria-labelledby="${heading}">
    ${labels.map((label, index) => `<button type="button" role="tab" id="${id}-tab-${index}"
      aria-controls="${id}-panel-${index}" aria-selected="${selected === index}" tabindex="${selected === index ? 0 : -1}">${label}</button>`).join('')}
  </div>`;
}

function renderProducts(t) {
  return `<section class="product-chapter" id="products" aria-labelledby="products-title">
    <div class="wrap">
      <div class="product-heading"><h2 id="products-title">${t.productTitle}</h2><p>${t.productText}</p></div>
      ${renderTabs('product', 'products-title', t.products.map(product => product.name), activeProduct)}
      ${t.products.map(renderPanel).join('')}
    </div>
  </section>`;
}

function renderDemo(t) {
  return `<section class="demo-chapter" id="flow" aria-labelledby="flow-title">
    <div class="wrap studio">
      <div class="studio-title"><h2 id="flow-title">${t.flowTitle}</h2><p>${t.flowText}</p></div>
      ${renderTabs('demo', 'flow-title', t.demoTabs, 0, 'product-tabs demo-tabs')}
      <div class="film" id="demo-preview">
        ${walkthroughs.map((asset, index) => `
          <div role="tabpanel" id="demo-panel-${index}" aria-labelledby="demo-tab-${index}" tabindex="0" ${index === 0 ? '' : 'hidden'}>
            <video width="2128" height="1198" poster="${asset}-poster.png"
              aria-label="${t.demoDescriptions[index]}" muted loop playsinline preload="none"></video>
          </div>`).join('')}
      </div>
      <a class="guide-link chapter-guide" href="#/manual/trs">${t.products[0].link}<span aria-hidden="true">↗</span></a>
    </div>
  </section>`;
}

function bindDemo(section) {
  const frame = section.querySelector('#demo-preview');
  const videos = [...frame.querySelectorAll('video')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let active = 0;

  function syncPlayback() {
    videos.forEach((video, index) => {
      if (reducedMotion.matches) {
        if (video.hasAttribute('src')) {
          video.removeAttribute('src');
          video.load(); // Restore the poster when the preference changes during playback.
        }
      } else if (visible && index === active) {
        if (!video.hasAttribute('src')) video.src = walkthroughs[index] + '.mp4';
        // A browser may deny autoplay or interrupt play when the visitor scrolls away.
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }

  bindTabs(section, index => {
    active = index;
    syncPlayback();
  });
  const stopObserving = observeVisibility(frame, onScreen => {
    visible = onScreen;
    syncPlayback();
  });
  reducedMotion.addEventListener('change', syncPlayback);
  return () => {
    stopObserving();
    reducedMotion.removeEventListener('change', syncPlayback);
    videos.forEach(video => video.pause());
  };
}

export function renderGuestHome(t) {
  return `<main id="main-content" class="portal-home guest-home" tabindex="-1">
    <div class="home-intro">${renderHero(t, { selectable: false })}</div>
    ${renderTerminals(t, { compact: true })}
  </main>`;
}

export function renderHome(t, faqDestinations) {
  return `<main id="main-content" class="portal-home" tabindex="-1">
    <div class="home-intro">${renderHero(t)}${renderOverview(t)}</div>
    ${renderProducts(t)}${renderDemo(t)}${renderDestinations(t, faqDestinations)}
  </main>`;
}

function bindTabs(section, onSelect) {
  const tablist = section.querySelector('[role="tablist"]');
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(tab => section.querySelector('#' + tab.getAttribute('aria-controls')));
  let active = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');

  function select(index) {
    if (index === active) return;
    active = index;
    tabs.forEach((tab, position) => {
      const selected = position === index;
      tab.tabIndex = selected ? 0 : -1;
      tab.setAttribute('aria-selected', String(selected));
      panels[position].hidden = !selected;
    });
    onSelect?.(index);
  }

  tablist.addEventListener('click', event => {
    const index = tabs.indexOf(event.target.closest('[role="tab"]'));
    if (index >= 0) select(index);
  });
  tablist.addEventListener('keydown', event => {
    if (!event.target.matches('[role="tab"]')) return;
    const next = horizontalChoiceIndex(event.key, active, tabs.length);
    if (next < 0) return;
    event.preventDefault();
    select(next);
    tabs[next].focus();
  });
}

export function bindHome(root, t) {
  const hero = root.querySelector('#home');
  const releaseHero = bindHero(hero, t.banner);
  const products = root.querySelector('#products');
  if (!products) return releaseHero;

  bindTabs(products, index => { activeProduct = index; });

  const overview = root.querySelector('.overview-band');
  const grid = overview.querySelector('.benefit-grid');
  const alignContent = () => alignOverviewContent(grid);
  document.fonts?.addEventListener('loadingdone', alignContent);
  // Reserve the translated copy's actual height; the following chapters stay in normal flow.
  const stopMeasuring = observeSize(overview, ({ height }) => {
    hero.style.setProperty('--overview-height', `${Math.ceil(height)}px`);
    alignContent();
  });
  const releaseDemo = bindDemo(root.querySelector('#flow'));
  return () => {
    document.fonts?.removeEventListener('loadingdone', alignContent);
    stopMeasuring();
    releaseHero();
    releaseDemo();
  };
}
