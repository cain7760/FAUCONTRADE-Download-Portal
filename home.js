import { observeSize, observeVisibility } from './layout-observers.js';
import { horizontalChoiceIndex } from './choice-navigation.js';
import { renderHero, bindHero } from './hero-scenes.js';
import { renderDestinations } from './destinations.js';

const walkthrough = 'assets/customer-buy-demo.mp4';
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
  const gap = Math.min(96, freeWidth / 3);
  const middleLeft = bounds.left + firstWidth + gap;
  const middleOffset = middleLeft - cards[1].getBoundingClientRect().left;
  const lastOffset = middleLeft + middleWidth + gap - cards[2].getBoundingClientRect().left;
  cards[1].style.setProperty('--benefit-offset', Math.round(middleOffset) + 'px');
  cards[2].style.setProperty('--benefit-offset', Math.round(lastOffset) + 'px');
}

function renderJourney(product, isTrs) {
  return `<ol class="${isTrs ? 'execution-steps' : 'product-journey'}" role="list">
      ${product.features.map((title, step) => `<li>
        <div class="journey-heading">
          <span class="journey-number" aria-hidden="true">${isTrs ? String(step + 1).padStart(2, '0') : step + 1}</span>
          <h4>${title}</h4>
        </div>
        <p>${product.details[step]}</p>
      </li>`).join('')}
    </ol>`;
}

function renderPanel(product, index) {
  const isTrs = index === 0;
  return `<article role="tabpanel" aria-labelledby="product-tab-${index}" id="product-panel-${index}" class="product-panel${isTrs ? ' execution-panel' : ''}" tabindex="0" ${index === activeProduct ? '' : 'hidden'}>
    <div class="product-caption">
      <h3>${product.promise}</h3>
      <p>${product.text}</p>
    </div>
    ${renderJourney(product, isTrs)}
    <div class="guide-align"><a class="guide-link" href="#/manual/${isTrs ? 'trs' : 'options'}">${product.link}<span aria-hidden="true">↗</span></a></div>
  </article>`;
}

function renderProducts(t) {
  return `<section class="product-chapter" id="products" aria-labelledby="products-title">
    <div class="wrap">
      <div class="product-heading"><h2 id="products-title">${t.productTitle}</h2><p>${t.productText}</p></div>
      <div class="product-tabs" role="tablist" aria-labelledby="products-title">
        ${t.products.map((product, i) => `<button type="button" role="tab" id="product-tab-${i}" data-product="${i}"
          aria-controls="product-panel-${i}" aria-selected="${activeProduct === i}" tabindex="${activeProduct === i ? 0 : -1}">${product.name}</button>`).join('')}
      </div>
      ${t.products.map(renderPanel).join('')}
    </div>
  </section>`;
}

function renderDemo(t) {
  return `<section class="demo-chapter" id="flow" aria-labelledby="flow-title">
    <div class="wrap studio">
      <div class="studio-title"><h2 id="flow-title">${t.flowTitle}</h2><p>${t.flowText}</p></div>
      <div class="film" id="demo-preview">
        <video width="960" height="540" poster="assets/customer-buy-demo-poster.png"
          aria-label="${t.motionAlt}" autoplay muted loop playsinline preload="none"></video>
      </div>
      <a class="guide-link studio-guide" href="#/manual/trs">${t.products[0].link}<span aria-hidden="true">↗</span></a>
    </div>
  </section>`;
}

function bindDemo(video) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;

  function syncPlayback() {
    if (reducedMotion.matches) {
      if (video.hasAttribute('src')) {
        video.removeAttribute('src');
        video.load(); // Restore the poster when the preference changes during playback.
      }
    } else if (visible) {
      if (!video.hasAttribute('src')) video.src = walkthrough;
      // A browser may deny autoplay or interrupt play when the visitor scrolls away.
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  const stopObserving = observeVisibility(video, onScreen => {
    visible = onScreen;
    syncPlayback();
  });
  reducedMotion.addEventListener('change', syncPlayback);
  return () => {
    stopObserving();
    reducedMotion.removeEventListener('change', syncPlayback);
    video.pause();
  };
}

export function renderHome(t, faqDestinations) {
  return `<main id="main-content" class="portal-home" tabindex="-1">
    <div class="home-intro">${renderHero(t)}${renderOverview(t)}</div>
    ${renderProducts(t)}${renderDemo(t)}${renderDestinations(t, faqDestinations)}
  </main>`;
}

export function bindHome(root, t) {
  const products = root.querySelector('#products');
  const tabs = [...products.querySelectorAll('[data-product]')];
  const panels = [...products.querySelectorAll('[role="tabpanel"]')];

  function selectProduct(index) {
    activeProduct = index;
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.tabIndex = selected ? 0 : -1;
      tab.setAttribute('aria-selected', String(selected));
      panels[i].hidden = !selected;
    });
  }

  products.addEventListener('click', event => {
    const tab = event.target.closest('[data-product]');
    if (tab) selectProduct(Number(tab.dataset.product));
  });

  products.addEventListener('keydown', event => {
    if (!event.target.matches('[data-product]')) return;
    const next = horizontalChoiceIndex(event.key, activeProduct, tabs.length);
    if (next < 0) return;
    event.preventDefault();
    selectProduct(next);
    tabs[activeProduct].focus();
  });

  const hero = root.querySelector('#home');
  const overview = root.querySelector('.overview-band');
  const grid = overview.querySelector('.benefit-grid');
  const alignContent = () => alignOverviewContent(grid);
  document.fonts?.addEventListener('loadingdone', alignContent);
  // Reserve the translated copy's actual height; the following chapters stay in normal flow.
  const stopMeasuring = observeSize(overview, ({ height }) => {
    hero.style.setProperty('--overview-height', `${Math.ceil(height)}px`);
    alignContent();
  });
  const releaseHero = bindHero(hero, t.banner);
  const releaseDemo = bindDemo(root.querySelector('#demo-preview video'));
  return () => {
    document.fonts?.removeEventListener('loadingdone', alignContent);
    stopMeasuring();
    releaseHero();
    releaseDemo();
  };
}
