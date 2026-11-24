import { falconOrbitPoint } from './falcon-orbit.js';
import { createAtmosphere } from './atmosphere.js';

const sourceRatio = 1983 / 793;
const tau = 2 * Math.PI;
const marks = [
  [.43, .57, .916], [.59, .70, .863], [.66, .74, .909],
  [.75, .84, .858], [.84, .92, .908],
];

export function lightStudyCrop(sceneName, narrow) {
  if (sceneName === 'falcon-orbit') return .96;
  return narrow || sceneName === 'water-dial' ? .80 : .65;
}

function glow(ctx, x, y, radius, alpha, warm = true) {
  if (alpha <= .015) return;
  const rgb = warm ? '255,213,154' : '200,220,246';
  const reach = radius * 6;
  ctx.globalAlpha = Math.min(1, alpha);
  const halo = ctx.createRadialGradient(x, y, 0, x, y, reach);
  halo.addColorStop(0, 'rgba(' + rgb + ',.88)');
  halo.addColorStop(.21, 'rgba(' + rgb + ',.40)');
  halo.addColorStop(.6, 'rgba(' + rgb + ',.085)');
  halo.addColorStop(1, 'rgba(' + rgb + ',0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - reach, y - reach, reach * 2, reach * 2);
  ctx.fillStyle = warm ? '#fff0d4' : '#e8f4ff';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, tau);
  ctx.fill();
}

function bead(ctx, frame, path, position, alpha, warm, radius) {
  for (let k = 6; k >= 0; k--) {
    const [x, y] = path(position - k * .005);
    const size = (k ? radius * .5 : radius) * frame.scale;
    const opacity = alpha * (k ? (7 - k) * .04 : 1);
    glow(ctx, x, y, size, opacity, warm);
  }
}

function corridor(ctx, frame, elapsed) {
  // Centres of the continuous inlay on the 1983 × 793 poster, near to far.
  function path(position) {
    const t = Math.max(0, Math.min(1, position));
    const x = 1982 + (1190 - 1982) * t;
    const y = 446 + (579 - 446) * t;
    return [frame.left + x * frame.photoW / 1983, frame.top + y * frame.photoH / 793];
  }
  for (let i = 0; i < 3; i++) {
    const position = (elapsed / 11.6 + 1.22 - i * .27) % 1;
    for (let j = 0; j < 3; j++) {
      const u = position - j * .036;
      if (u < 0) continue;
      const fade = Math.min(1, u * 15, (1 - u) * 10);
      if (fade) bead(ctx, frame, path, u, fade * (1 - j * .18), i !== 1, 2.45 - u * .95);
    }
  }
}

function water(ctx, frame, elapsed) {
  marks.forEach(([x0, x1, y], i) => {
    const p = (elapsed / 5 + 2.22 - i * .16) % 1;
    if (p > .47) return;
    const u = p / .47;
    const fade = Math.sin(Math.PI * u);
    const x = frame.left + (x0 + (x1 - x0) * u) * frame.photoW;
    const py = frame.top + (y + .001 * Math.sin(u * tau)) * frame.photoH;
    const length = Math.min((x1 - x0) * frame.photoW * u, 34 * frame.scale);
    if (length > .01) {
      const streak = ctx.createLinearGradient(x - length, py, x, py);
      streak.addColorStop(0, 'rgba(224,191,143,0)');
      streak.addColorStop(1, 'rgba(255,228,183,.82)');
      ctx.globalAlpha = fade;
      ctx.fillStyle = streak;
      ctx.fillRect(x - length, py, length, 1.3 * frame.scale);
      ctx.globalAlpha = fade * .33;
      ctx.fillRect(x - length * .6, py + 2.6 * frame.scale, length * .6, frame.scale);
    }
    glow(ctx, x, py, 1.95 * frame.scale, fade, i % 3 !== 1);
  });
}

function falconOrbit(ctx, frame, elapsed) {
  for (const [offset, warm] of [[.36, true], [.83, false]]) {
    for (let k = 3; k >= 0; k--) {
      const angle = tau * (elapsed / 16.8 + offset) - k * .012;
      const point = falconOrbitPoint(angle);
      const strength = (warm ? .70 : .53) * point.alpha * (k ? (4 - k) * .10 : 1);
      glow(ctx, frame.left + point.x * frame.photoW / 1000,
        frame.top + point.y * frame.photoH / 400,
        frame.scale * (k ? .48 : warm ? 1.55 : 1.20), strength, warm);
    }
  }
}

const renderers = {
  'order-corridor': corridor,
  'water-dial': water,
  'falcon-orbit': falconOrbit,
};

// The caller owns the clock (seconds), DPR transform, and the photo beneath the canvas.
export function createLightStudyRenderer(sceneName) {
  if (!Object.prototype.hasOwnProperty.call(renderers, sceneName)) throw new RangeError('Unknown light study: ' + sceneName);
  const render = renderers[sceneName];
  const atmosphere = createAtmosphere(sceneName);
  const frame = {};
  return function draw(ctx, width, height, elapsed) {
    if (!width || !height) return;
    if (width !== frame.width || height !== frame.height) {
      frame.width = width;
      frame.height = height;
      frame.photoW = Math.max(width, height * sourceRatio);
      frame.photoH = frame.photoW / sourceRatio;
      frame.left = (width - frame.photoW) * lightStudyCrop(sceneName, width <= 680);
      frame.top = (height - frame.photoH) * .5;
      frame.scale = Math.min(1.65, Math.max(.85, frame.photoW / 1440));
    }
    ctx.clearRect(0, 0, width, height);
    atmosphere?.(ctx, frame, elapsed);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    render(ctx, frame, elapsed);
    ctx.restore();
  };
}
