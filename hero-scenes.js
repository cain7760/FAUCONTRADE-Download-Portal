import { observeSize, observeVisibility } from './layout-observers.js';
import { horizontalChoiceIndex } from './choice-navigation.js';
import { falconTabletFrame, loadFalconScene } from './falcon-scene.js';
import { tabletSize } from './tablet-layout.js';
import { createHarbourScene } from './harbour-scene.js';
import { createLightStudyRenderer, lightStudyCrop } from './light-studies/motion.js';

function lightStudy(name) {
  return {
    poster: `light-studies/${name}.webp`, left: true, study: true,
    load: () => createLightStudyRenderer(name),
  };
}

const scenes = {
  falcon: { poster: 'assets/scene-falcon.webp', load: loadFalconScene, left: true },
  'hong-kong': { poster: 'assets/scene-hong-kong.webp', load: createHarbourScene },
  'financial-district': { poster: 'assets/financial-district.webp' },
  'order-corridor': lightStudy('order-corridor'),
  'falcon-orbit': lightStudy('falcon-orbit'),
};
const sceneAliases = {
  'paper-surface': 'financial-district',
  'falcon-plinth': 'falcon',
  'market-depth': 'falcon',
  'twilight-desk': 'falcon',
  'twilight-orbit': 'falcon',
  'optical-prism': 'falcon',
  'meridian-routes': 'order-corridor',
  'golden-waves': 'falcon',
  'water-dial': 'falcon',
  'cinnabar-dial': 'falcon',
  'ink-tide': 'falcon',
};
const names = Object.keys(scenes);
let motionOverride;

function currentScene() {
  const url = new URL(location.href);
  const scene = url.searchParams.get('scene');
  if (Object.keys(sceneAliases).includes(scene)) {
    const replacement = sceneAliases[scene];
    url.searchParams.set('scene', replacement);
    history.replaceState(history.state, '', url);
    return replacement;
  }
  return names.includes(scene) ? scene : 'falcon';
}

export function renderHero(t, { selectable = true, action = '' } = {}) {
  const scene = selectable ? currentScene() : 'falcon';
  const words = t.banner;
  const [first, second] = t.heroTitle.split('<br>');
  return `<section class="market-cover${scenes[scene].left ? ' cover-left' : ''}${scenes[scene].study ? ' cover-study' : ''}" id="home" data-art="${scene}" aria-labelledby="hero-title">
    <div class="cover-art" aria-hidden="true">
      <img class="cover-poster" src="${scenes[scene].poster}" alt="" fetchpriority="high">
      <canvas></canvas>
    </div>
    <div class="wrap cover-copy">
      <h1 id="hero-title"><span>${first}</span><span>${second}</span></h1>
      ${t.heroEnglishTitle ? `<span class="cover-english-title" lang="en">${t.heroEnglishTitle}</span>` : ''}
      <p>${t.heroText}</p>${action}
    </div>
    ${selectable ? `<div class="wrap cover-tools">
      <div class="scene-choices" role="group" aria-label="${words.group}">
        ${names.map((name, i) => `<button type="button" data-scene="${name}" aria-pressed="${name === scene}">${words.scenes[i]}</button>`).join('')}
      </div>
      <button type="button" class="motion-toggle" data-motion hidden><span aria-hidden="true"></span></button>
    </div>` : ''}
  </section>`;
}

// Lay out the tablet once per resize. The falcon keeps its original frame.
function positionTablet(frame, art, copy, contentWrap) {
  const box = art.getBoundingClientRect();
  const narrow = box.width <= 700;
  const centerY = box.top + box.height * (narrow ? .48 : .49);
  let halfHeight = frame.scale * tabletSize.height / 2;
  const float = Math.min(5, frame.scale * 3.6);
  let leftLimit = Math.min(16, Math.ceil(box.width * .04));
  const range = document.createRange();
  for (const node of copy.querySelectorAll('h1 span, .cover-english-title, p')) {
    range.selectNodeContents(node);
    for (const line of range.getClientRects()) {
      if (line.bottom <= box.top) {
        // On a stacked phone the caption is above the artwork, even at the top of its float.
        halfHeight = Math.min(halfHeight, centerY - line.bottom - float - 16);
      } else if (line.bottom > centerY - halfHeight - float && line.top < centerY + halfHeight + float) {
        leftLimit = Math.max(leftLimit, line.right - box.left + 16);
      }
    }
  }
  // Fit the tablet between the headline and the right edge of the content area.
  const sizingCenter = frame.center - (box.width > 980 ? 80 : 0);
  const right = contentWrap.getBoundingClientRect().right - box.left;
  const width = Math.max(1, Math.min(
    2 * halfHeight * tabletSize.width / tabletSize.height,
    2 * (sizingCenter - leftLimit),
    right - leftLimit
  ));
  return {center: right - width / 2, left: right - width, scale: width / tabletSize.width};
}

export function bindHero(section, words) {
  const canvas = section.querySelector('canvas');
  const art = section.querySelector('.cover-art');
  const copy = section.querySelector('.cover-copy');
  const contentWrap = section.querySelector('.cover-tools') ?? copy;
  const context = canvas.getContext('2d');
  const poster = section.querySelector('.cover-poster');
  const motion = section.querySelector('[data-motion]');
  const choices = section.querySelectorAll('[data-scene]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const options = { signal: listeners.signal };

  const renderers = new Map();
  let draw, width, height, tabletPose, frame = 0, visible = false, elapsed = 0, lastTick;
  let request = 0;
  function playing() { return motionOverride ?? !reduced.matches; }
  function updateMotionButton() {
    if (!motion) return;
    motion.hidden = !draw;
    const label = playing() ? words.pause : words.play;
    motion.setAttribute('aria-label', label);
    motion.title = label;
    motion.classList.toggle('is-playing', playing());
  }
  function paint() {
    if (draw && width && height) {
      draw(context, width, height, elapsed, tabletPose);
      canvas.classList.add('is-ready');
    }
  }
  // Limit decorative animation to 30 fps. The local clock stops when the banner is hidden.
  function tick(now) {
    if (lastTick == null) lastTick = now;
    if (now - lastTick >= 1000 / 30 - 1) {
      elapsed += Math.min(now - lastTick, 100) / 1000;
      lastTick = now;
      paint();
    }
    frame = requestAnimationFrame(tick);
  }
  function schedule() {
    cancelAnimationFrame(frame);
    lastTick = undefined;
    if (draw && visible && !document.hidden && playing()) frame = requestAnimationFrame(tick);
  }
  function resize() {
    width = art.clientWidth;
    height = art.clientHeight;
    const name = section.dataset.art;
    if (name === 'falcon') {
      const tablet = falconTabletFrame(width, height);
      const rightInset = width - tablet.right;
      const balancedShift = Math.round((rightInset - copy.offsetLeft) / 2);
      // Keep the widest pose clear of the headline's half of the content area.
      const minimumShift = Math.ceil(width / 2 + 16 - tablet.left);
      const shift = Math.max(balancedShift, minimumShift);
      section.style.setProperty('--falcon-shift', `${shift}px`);
      tabletPose = positionTablet(tablet, art, copy, contentWrap);
    }
    if (scenes[name].study) {
      art.style.setProperty('--study-crop', `${lightStudyCrop(name, width <= 680) * 100}%`);
    }
    if (!context || !width || !height) return;
    const limit = name === 'falcon' ? Math.min(3, Math.sqrt(8000000 / (width * height))) : 2;
    const resolution = Math.min(devicePixelRatio || 1, limit);
    canvas.width = Math.round(width * resolution);
    canvas.height = Math.round(height * resolution);
    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    paint();
  }
  async function showScene(name) {
    const revision = ++request;
    section.dataset.art = name;
    section.classList.toggle('cover-left', Boolean(scenes[name].left));
    section.classList.toggle('cover-study', Boolean(scenes[name].study));
    choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scene === name)));
    const asset = scenes[name].poster;
    if (poster.getAttribute('src') !== asset) poster.src = asset;
    draw = undefined;
    elapsed = 0;
    canvas.classList.remove('is-ready');
    updateMotionButton();
    schedule();
    resize();
    if (!context || !scenes[name].load) return;
    try {
      if (!renderers.has(name)) renderers.set(name, scenes[name].load());
      const renderer = await renderers.get(name);
      if (listeners.signal.aborted || revision !== request) return;
      draw = renderer;
      paint();
      updateMotionButton();
      schedule();
    } catch {
      renderers.delete(name);
      // The scene's static artwork remains available if the canvas asset cannot load.
    }
  }
  const sceneChoices = section.querySelector('.scene-choices');
  sceneChoices?.addEventListener('click', event => {
    const button = event.target.closest('button[data-scene]');
    if (!button || section.dataset.art === button.dataset.scene) return;
    const url = new URL(location.href);
    url.searchParams.set('scene', button.dataset.scene);
    history.replaceState(null, '', url);
    showScene(button.dataset.scene);
  }, options);
  sceneChoices?.addEventListener('keydown', event => {
    const current = names.indexOf(event.target.dataset.scene);
    if (current < 0) return;
    const next = horizontalChoiceIndex(event.key, current, choices.length);
    if (next < 0) return;
    event.preventDefault();
    choices[next].focus();
    choices[next].click();
  }, options);
  motion?.addEventListener('click', () => {
    motionOverride = !playing();
    updateMotionButton();
    schedule();
  }, options);
  reduced.addEventListener('change', () => {
    motionOverride = undefined;
    updateMotionButton();
    schedule();
  }, options);
  document.addEventListener('visibilitychange', schedule, options);
  const stopVisibility = observeVisibility(section, onScreen => {
    visible = onScreen;
    schedule();
  });
  const stopResizing = observeSize(art, resize);
  showScene(section.dataset.art);
  document.fonts?.ready.then(() => {
    if (!listeners.signal.aborted && section.dataset.art === 'falcon') resize();
  });
  return () => {
    listeners.abort();
    stopResizing();
    stopVisibility();
    cancelAnimationFrame(frame);
  };
}
