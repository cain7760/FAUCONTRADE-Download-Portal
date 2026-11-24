import { actionAt, actionColors, sampleTablet, tabletMask, tabletSize } from './tablet-layout.js';

const silver = [244, 243, 240];
const textureSilver = [235, 234, 231];
const actionRGB = actionColors.map(hex => [
  parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16),
]);
const centerX = 132;
const centerY = 138.5;
const pad = 64;
const resolution = 2;
const width = (264 + 2 * pad) * resolution;
const height = (277 + 2 * pad) * resolution;

function ease(t) {
  return t * t * (3 - 2 * t);
}

function drawFloatingTablet(ctx, plate, opacity) {
  const transform = ctx.getTransform();
  // Anchor the native-resolution texture at the centre of the moving grains.
  const x = Math.round(transform.e + centerX * transform.a - plate.width / 2);
  const top = transform.f + centerY * transform.d - plate.height / 2;
  const y = Math.round(top);
  const offset = top - y;
  // Three neighbouring rows share the light. Their weights sum to one, their
  // centroid follows the fractional offset, and their squared sum stays constant.
  const middle = (1 + Math.sqrt(1 - 3 * offset * offset)) / 3;
  // Keep their sum exact after Canvas quantises the contributions to 8-bit alpha.
  const total = Math.round(opacity * 255);
  const above = Math.round(total * (1 - middle - offset) / 2);
  const below = Math.round(total * (1 - middle + offset) / 2);
  ctx.save();
  ctx.resetTransform();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = above / 255;
  ctx.drawImage(plate, x, y - 1);
  ctx.globalAlpha = (total - above - below) / 255;
  ctx.drawImage(plate, x, y);
  ctx.globalAlpha = below / 255;
  ctx.drawImage(plate, x, y + 1);
  ctx.restore();
}

// Let both forms settle before the particles travel again.
export function tabletProgress(time) {
  const phase = time % 16;
  if (phase <= 4.8 || phase >= 13.9) return 0;
  if (phase < 7.2) return (phase - 4.8) / 2.4;
  if (phase <= 11.3) return 1;
  return (13.9 - phase) / 2.6;
}

export function createMorph(grains, random, brand) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const pixels = ctx.createImageData(width, height);
  const rgba = pixels.data;
  // Silver is the base colour. Actions tint their share of the same splat coverage.
  for (let i = 0; i < rgba.length; i += 4) {
    rgba.set(silver, i);
  }
  const light = new Float32Array(width * height);
  const opacity = Uint8ClampedArray.from({length: 2048}, (_, i) => 255 * (1 - Math.exp(-i / 245)));
  const mask = tabletMask(brand);
  const targets = sampleTablet(grains.length, random, mask);
  const settledGrains = [];
  const paths = grains.map((grain, i) => {
    const target = targets[i];
    const size = .25 + random() * .08 + target.ink * .12;
    const alpha = Math.min(.98, .37 + target.ink * .70 + random() * .11);
    const variation = random();
    if (target.visible) {
      const azimuth = target.rimDirection + (variation - .5) * 1.3;
      const length = size * (1 + .9 * variation);
      const mark = {x: target.x, y: target.y, dx: length * Math.cos(azimuth),
        dy: length * Math.sin(azimuth), alpha, variation, action: target.action};
      // Keep the brighter silver specks in the same raster as the rest of the floating tablet.
      if (target.action < 0 && i % 111 === 0 && target.ink > .28) {
        mark.alpha += (1 - alpha) * random() * .43;
      }
      settledGrains.push(mark);
    }
    const angle = Math.atan2(grain.y - 138, grain.x - 132) + .62 + (random() - .5) * .95;
    const radius = 34 + 100 * Math.sqrt(random());
    const dustX = 132 + radius * 1.13 * Math.cos(angle);
    const dustY = 138 + radius * .86 * Math.sin(angle);
    return {
      startX: grain.x - centerX, startY: grain.y - centerY,
      endX: target.x - centerX, endY: target.y - centerY,
      bendX: dustX - (grain.x + target.x) / 2, bendY: dustY - (grain.y + target.y) / 2,
      action: target.visible ? target.action : -1,
      delay: .06 * (grain.y / 277) + .11 * random(),
      energy: Math.min(1900, grain.size * grain.size * grain.alpha * 2900),
      surfaceEnergy: target.visible ? Math.min(1900, size * size * alpha * 3500) : 0,
    };
  });
  // A bright one-pixel core and a short tapered tail resolve even below one CSS pixel.
  let settled, lastRatio;
  function tabletAt(pixelScaleX, pixelScaleY, pixelRatio) {
    const cols = Math.max(1, Math.round(width / resolution * pixelScaleX));
    const rows = Math.max(1, Math.round(height / resolution * pixelScaleY));
    if (settled?.width === cols && settled.height === rows && lastRatio === pixelRatio) return settled;
    lastRatio = pixelRatio;
    settled = document.createElement('canvas');
    settled.width = cols;
    settled.height = rows;
    const dust = settled.getContext('2d');
    const scaleX = cols / (width / resolution), scaleY = settled.height / (height / resolution);
    // Micrograins within the controls keep their fill legible at every display density.
    // Their footprint is one physical pixel; the empty screen remains transparent.
    const left = pad + (264 - tabletSize.width) / 2, top = pad + (277 - tabletSize.height) / 2;
    const texture = dust.createImageData(cols, settled.height);
    const rgba = texture.data;
    let seed = 315631;
    for (let y = Math.ceil(top * scaleY); y < (top + tabletSize.height) * scaleY; y++) {
      const sy = Math.floor(y / scaleY - top);
      for (let x = Math.ceil(left * scaleX); x < (left + tabletSize.width) * scaleX; x++) {
        const sx = Math.floor(x / scaleX - left);
        const ink = mask[(sy * tabletSize.width + sx) * 4] / 255;
        const i = (y * cols + x) * 4;
        if (ink < .34) continue;
        const rim = sx < 9 || sx >= tabletSize.width - 9 || sy < 10 || sy >= tabletSize.height - 9;
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const density = rim ? .12 : .47 * ink * ink;
        if (seed / 4294967296 >= density) continue;
        const tint = actionRGB[actionAt(sx, sy)] ?? textureSilver;
        rgba.set(tint, i);
        rgba[i + 3] = 100 + 102 * ink;
      }
    }
    dust.putImageData(texture, 0, 0);
    for (const p of settledGrains) {
      dust.fillStyle = actionColors[p.action] ?? '#eeebe6';
      const x = (p.x + pad) * scaleX, y = (p.y + pad) * scaleY;
      const dx = p.dx * scaleX, dy = p.dy * scaleY;
      const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)));
      for (let step = steps; step > 0; step--) {
        const t = step / steps;
        dust.globalAlpha = p.alpha * (.56 - .24 * t);
        dust.fillRect(Math.floor(x + dx * t), Math.floor(y + dy * t), 1, 1);
      }
      dust.globalAlpha = p.alpha;
      const px = Math.floor(x), py = Math.floor(y);
      dust.fillRect(px, py, 1, 1);
      // On dense displays about half a CSS pixel can span two actual pixels.
      if (p.variation < pixelRatio * .63 - 1) {
        const horizontal = Math.abs(dx) >= Math.abs(dy);
        dust.fillRect(px + (horizontal ? 0 : 1), py + (horizontal ? 1 : 0), 1, 1);
      }
    }
    dust.globalAlpha = 1;
    return settled;
  }

  return (context, progress, pixelScaleX, pixelScaleY, pixelRatio, frame) => {
    const alpha = context.globalAlpha;
    // Start revealing the tablet as grains converge, while they still carry light.
    const finish = ease(Math.max(0, Math.min(1, (progress - .52) / .30)));
    if (finish < 1) {
      light.fill(0);
      // Only the two action areas need a colour field during the transition.
      const tintEnergy = actionColors.map(() => new Map());
      // Follow the grains with the sampling window to preserve their original resolution.
      // Drawing the window back at its offset keeps both silhouettes anchored.
      const sampleOrigin = centerX + pad - frame.sampleOffset;
      for (const p of paths) {
        const t = ease(Math.max(0, Math.min(1, (progress - p.delay) / .82)));
        const from = (1 - t) * frame.headScale, to = t * frame.tabletScale;
        const drift = 4 * t * (1 - t) * (from + to);
        const x = (sampleOrigin + (1 - t) * frame.headOffset + from * p.startX + to * p.endX + drift * p.bendX) * resolution;
        const y = (centerY + pad + from * p.startY + to * p.endY + drift * p.bendY) * resolution;
        const ix = Math.floor(x), iy = Math.floor(y);
        if (ix < 0 || iy < 0 || ix >= width - 1 || iy >= height - 1) continue;
        const fx = x - ix, fy = y - iy;
        const index = iy * width + ix;
        const energy = p.energy * (1 - t) + p.surfaceEnergy * t;
        const a = energy * (1 - fx) * (1 - fy), b = energy * fx * (1 - fy);
        const c = energy * (1 - fx) * fy, d = energy * fx * fy;
        light[index] += a; light[index + 1] += b;
        light[index + width] += c; light[index + width + 1] += d;
        if (p.action >= 0 && t > .6) {
          const mix = ease((t - .6) / .4), field = tintEnergy[p.action];
          field.set(index, (field.get(index) || 0) + a * mix);
          field.set(index + 1, (field.get(index + 1) || 0) + b * mix);
          field.set(index + width, (field.get(index + width) || 0) + c * mix);
          field.set(index + width + 1, (field.get(index + width + 1) || 0) + d * mix);
        }
      }
      for (let i = 0; i < light.length; i++) rgba[i * 4 + 3] = opacity[Math.min(2047, light[i] | 0)];
      tintEnergy.forEach((field, action) => {
        const tint = actionRGB[action];
        for (const [index, energy] of field) {
          if (!energy) continue;
          const mix = Math.min(1, energy / light[index]);
          for (let channel = 0; channel < 3; channel++) {
            rgba[index * 4 + channel] += (tint[channel] - silver[channel]) * mix;
          }
        }
      });
      ctx.putImageData(pixels, 0, 0);
      for (const field of tintEnergy) {
        for (const index of field.keys()) rgba.set(silver, index * 4);
      }
      context.globalAlpha = alpha * (1 - finish);
      context.drawImage(canvas, frame.sampleOffset - pad, -pad, width / resolution, height / resolution);
    }
    if (finish > 0) {
      drawFloatingTablet(context, tabletAt(pixelScaleX, pixelScaleY, pixelRatio), alpha * finish);
    }
    context.globalAlpha = alpha;
  };
}
