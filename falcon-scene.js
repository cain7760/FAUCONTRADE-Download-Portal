import { drawPlate } from './grain-detail.js';
import { createMorph, tabletProgress } from './falcon-morph.js';
import { tabletSize } from './tablet-layout.js';

// The animation and its tablet transition share this logical coordinate system.
const headWidth = 264;
const headHeight = 277;
const padding = 40;
const tau = Math.PI * 2;
let scenePromise;

function randomSequence(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function dot(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, tau);
  ctx.fill();
}

// Rasterize the settled circles directly at the displayed pixel density.
function headPlate(grains) {
  const w = headWidth + padding * 2, h = headHeight + padding * 2;
  let plate;
  return pixelScale => {
    const width = Math.max(1, Math.round(w * pixelScale));
    if (plate?.width === width) return plate;
    plate = document.createElement('canvas');
    plate.width = width;
    plate.height = Math.max(1, Math.round(h * pixelScale));
    const ctx = plate.getContext('2d');
    const sx = width / w, sy = plate.height / h;
    const exposure = 1 + .38 / Math.max(.8, sx * sx);
    for (const grain of grains) {
      ctx.fillStyle = grain.color;
      const radius = grain.radius * sx;
      const x = (grain.x + padding) * sx, y = (grain.y + padding) * sy;
      if (radius < .63) {
        // A subpixel circle contributes its area to the nearest pixel instead of a soft halo.
        ctx.globalAlpha = Math.min(1, grain.alpha * exposure * radius * radius * 4.7);
        dot(ctx, Math.floor(x) + .5, Math.floor(y) + .5, .5);
      } else {
        ctx.globalAlpha = Math.min(1, grain.alpha * exposure);
        dot(ctx, x, y, radius);
      }
    }
    return plate;
  };
}

function dustFromLogo(image, random) {
  const mask = document.createElement('canvas');
  // Visible bounds of the official standalone icon inside its 1024 × 1024 SVG artboard.
  mask.width = 763;
  mask.height = 800;
  const sampler = mask.getContext('2d', {willReadFrequently: true});
  sampler.drawImage(image, -131, -112);
  const rgba = sampler.getImageData(0, 0, mask.width, mask.height).data;
  const scaleX = mask.width / headWidth, scaleY = mask.height / headHeight;
  function pixel(x, y) {
    if (x < 0 || y < 0 || x >= headWidth || y >= headHeight) return -1;
    return 4 * (Math.floor(y * scaleY) * mask.width + Math.floor(x * scaleX));
  }
  function filled(x, y) {
    const i = pixel(x, y);
    return i >= 0 && rgba[i + 3] > 140;
  }

  const silver = ['#a3a6a8', '#dde1e3', '#fffef9'];
  // The warm pixels in the brand mask cover only the lower crescent and the third bar.
  const champagne = ['#aa987f', '#ddc7a5', '#f3e4ce'];
  const grains = [], still = [];
  const currents = new Map();
  const driftRandom = randomSequence(437);
  function addGrain(grain, phase, outside = false) {
    grains.push(grain); // The same complete set still travels to the tablet.
    const {x, y, radius, alpha, color} = grain;
    const dx = x - 138, dy = y - 141, distance = Math.max(1, Math.hypot(dx, dy));
    const tx = -dy / distance, ty = dx / distance;
    const travel = outside ? 5.2 + driftRandom() * 3.5 : 3.2 + driftRandom() * 2.4;
    // Keep the face, bars and cut-outs anchored while the crest and shed dust circulate.
    const mobile = outside || ((x < 111 || y < 64) &&
      filled(x + tx * travel, y + ty * travel) && filled(x - tx * travel, y - ty * travel));
    if (!mobile || (phase === null && driftRandom() > (outside ? .37 : .30))) {
      still.push(grain);
      return;
    }
    // Batch equal tones. Movement changes coordinates only, so light never pulses.
    const tone = Math.round(alpha * 16);
    const key = color + tone;
    if (!currents.has(key)) currents.set(key, {color, alpha: tone / 16, grains: []});
    const offset = Math.atan2(dy, dx) * 1.65 + .58 * Math.sin(phase ?? driftRandom() * tau);
    currents.get(key).grains.push({x, y, radius, dx: tx * travel, dy: ty * travel, offset});
  }
  for (let i = 0; i < 161000; i++) {
    const x = random() * headWidth, y = random() * headHeight;
    if (!filled(x, y)) continue;
    const u = (x - 138) / 138, v = (y - 141) / 141;
    const radius = Math.hypot(u, v);
    const angle = Math.atan2(v, u);
    // A broad crescent of light rolls over the crown, with thinner currents winding through it.
    const shoulder = Math.max(0, Math.cos(angle + 2.12));
    const crest = Math.exp(-((radius - .86) ** 2) / .015) * shoulder;
    const stream = .5 + .5 * Math.sin(23 * radius - 2.4 * angle + .9 * Math.sin(4 * angle));
    const surface = .29 + .34 * shoulder + .7 * crest + .13 * stream;
    const isBar = x > 139 && y > 142;
    const face = x > 117 && y < 205 && !isBar;
    const value = random();
    if (value > Math.min(.93, surface + (face || isBar ? .22 : .02))) continue;
    const index = pixel(x, y);
    const shades = rgba[index] - rgba[index + 2] > 70 ? champagne : silver;
    const pick = random();
    const color = shades[pick > .78 ? 2 : pick > .34 ? 1 : 0];
    const brightness = Math.min(1, .19 + .42 * surface + .29 * random() + (face ? .07 : 0)) * (1 - .25 * crest);
    const size = (.14 + .46 * random() ** 2 + .34 * crest) * (pick > .986 ? 1.7 : 1);
    // Preserve the area of the fine silver marks, including the brighter crest.
    const radiusOnPlate = Math.min(size * .94, Math.sqrt(size * .68));
    addGrain({x, y, size, radius: radiusOnPlate, alpha: brightness, color},
      pick > .972 ? random() * tau : null);
    const nx = u / Math.max(.01, radius), ny = v / Math.max(.01, radius);
    if (radius < .8 || filled(x + 5 * nx, y + 5 * ny) || !filled(x - 3 * nx, y - 3 * ny)) continue;

    // Only the outside contour sheds dust. The eye, beak and slots stay open.
    for (let j = 0; j < 4; j++) {
      const drift = Math.min(32, -Math.log(.005 + .995 * random()) * (4 + 5.8 * shoulder));
      const curl = (random() - .43) * drift * 1.8;
      const dx = x + drift * nx - curl * ny, dy = y + drift * ny + curl * nx;
      const grain = (.13 + .60 * random() ** 3) * (random() > .975 ? 1.75 : 1);
      const alpha = (.16 + .73 * random()) * Math.exp(-drift / 26) * (.55 + .5 * shoulder);
      const radiusOnPlate = grain * .80;
      addGrain({x: dx, y: dy, size: grain, radius: radiusOnPlate, alpha, color},
        random() < .065 ? random() * tau : null, true);
    }
  }
  return {body: headPlate(still), currents, grains, emblem: mask};
}

// Share the widest pose with the layout so the headline stays put throughout the morph.
export function falconTabletFrame(width, height) {
  const narrow = width <= 700;
  const center = width * (narrow ? .53 : width <= 980 ? .78 : .768);
  const safeInset = Math.max(10, width * .02);
  const scale = Math.min(
    width * (narrow ? .84 : width <= 980 ? .415 : .44) / tabletSize.width,
    height * (narrow ? .90 : .81) / tabletSize.height,
    2 * (width - center - safeInset) / tabletSize.width
  );
  const halfWidth = scale * tabletSize.width / 2;
  return {center, scale, left: center - halfWidth, right: center + halfWidth};
}

function composeFalcon(image) {
  const random = randomSequence(73311);
  const {body, currents, grains, emblem} = dustFromLogo(image, random);
  let drawMorph, warmupRequested = false;
  function prepareMorph() {
    return drawMorph ??= createMorph(grains, random, emblem);
  }
  const ribbon = Array.from({length: 1800}, () => ({
    progress: random(), lane: random() - .5, noise: random() - .5,
    size: .32 + random() ** 4 * 1.15, light: .15 + random() * .55,
  }));
  return (ctx, width, height, time, tablet = falconTabletFrame(width, height)) => {
    const pixelRatio = ctx.canvas.width / width;
    const narrow = width <= 700;
    const headScale = Math.min(width * (narrow ? .52 : width <= 980 ? .30 : .36) / headWidth,
      height * (narrow ? .75 : .77) / headHeight);
    const cx = width * (narrow ? .64 : width <= 980 ? .793 : .768);
    const cy = height * (narrow ? .48 : .49);
    ctx.fillStyle = '#07080a';
    ctx.fillRect(0, 0, width, height);

    const progress = tabletProgress(time);
    // Give the wider tablet its own framing. On phones the artwork has a full row.
    const pose = progress * progress * (3 - 2 * progress);
    const {center: deviceCenter, scale: deviceScale, left: tabletLeft} = tablet;

    // The low ribbon flows underneath the lettering and winds into the back of the head.
    const unit = Math.min(1.45, Math.max(.7, width / 1150));
    ctx.fillStyle = '#bfc4c9';
    for (const particle of ribbon) {
      const u = (particle.progress + time * .023) % 1;
      const x = width * ((narrow ? .02 : .28) + (narrow ? .51 : .40) * u);
      const twist = u * 5.6 + .16 * Math.sin(time * .4);
      const y = height * (.68 + .16 * Math.sin(twist) + particle.lane *
        (.055 + .18 * (1 - u) ** 2 + .042 * Math.cos(twist * 1.35)) + particle.noise * .033);
      const size = particle.size * unit;
      // Fade the rear ribbon at the front glass so its larger sparks never cross a control.
      const approach = Math.max(0, Math.min(1, (tabletLeft - x) / (width * .05)));
      ctx.globalAlpha = particle.light * Math.sin(Math.PI * u) ** .8 * (1 - pose * (1 - approach));
      ctx.fillRect(x, y, size, size);
    }
    if (time > 0 && progress === 0 && !drawMorph && !warmupRequested && window.requestIdleCallback) {
      warmupRequested = true;
      window.requestIdleCallback(prepareMorph, {timeout: 1000});
    }
    // Each silhouette has its own fixed horizontal anchor.
    const falconOpacity = Math.max(0, 1 - progress / .16);
    if (falconOpacity > 0) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(headScale, headScale);
      ctx.translate(-headWidth / 2, -headHeight / 2);
      const w = headWidth + padding * 2, h = headHeight + padding * 2;
      ctx.globalAlpha = falconOpacity;
      drawPlate(ctx, body(headScale * pixelRatio), -padding, -padding, w, h);
      for (const group of currents.values()) {
        ctx.fillStyle = group.color;
        ctx.globalAlpha = falconOpacity * group.alpha;
        ctx.beginPath();
        for (const p of group.grains) {
          const displacement = Math.sin(time * 1.26 + p.offset) * falconOpacity;
          const x = p.x + p.dx * displacement, y = p.y + p.dy * displacement;
          ctx.moveTo(x + p.radius, y);
          ctx.arc(x, y, p.radius, 0, tau);
        }
        ctx.fill();
      }
      ctx.restore();
    }
    if (progress > 0) {
      const bufferScale = headScale * (1 - pose) + deviceScale * pose;
      const headOffset = (cx - deviceCenter) / bufferScale;
      const floatPhase = 1 - Math.abs(time % 4 - 2);
      const tabletLift = floatPhase * Math.min(5, deviceScale * 3.6) * pose;
      ctx.save();
      ctx.translate(deviceCenter, cy + tabletLift);
      ctx.scale(bufferScale, bufferScale);
      ctx.translate(-headWidth / 2, -headHeight / 2);
      ctx.globalAlpha = 1 - falconOpacity;
      const draw = prepareMorph();
      draw(ctx, progress, deviceScale * pixelRatio, deviceScale * ctx.canvas.height / height, pixelRatio, {
        headScale: headScale / bufferScale,
        tabletScale: deviceScale / bufferScale,
        headOffset,
        sampleOffset: (1 - pose) * headOffset,
      });
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };
}

export function loadFalconScene() {
  if (!scenePromise) {
    const image = new Image();
    image.src = new URL('./assets/falcon-emblem-dark.svg', import.meta.url).href;
    scenePromise = image.decode().then(() => composeFalcon(image)).catch(error => {
      scenePromise = undefined;
      throw error;
    });
  }
  return scenePromise;
}
