import { createGrainSpacing } from './grain-spacing.js';

// This mask places grains; its panels are never composited into the banner.
export const tabletSize = {width: 366, height: 238};

// Buy and sell follow the order ticket's --ft-color-buy and --ft-color-sell tokens.
export const actionColors = ['#aa4950', '#3d9275'];
const actionLeft = [261, 305];
const actionTop = 187, actionWidth = 41, actionHeight = 23;

export function actionAt(x, y) {
  if (y < actionTop || y >= actionTop + actionHeight) return -1;
  return actionLeft.findIndex(left => x >= left && x < left + actionWidth);
}

export function tabletMask(brand) {
  const {width, height} = tabletSize;
  const mask = document.createElement('canvas');
  mask.width = width;
  mask.height = height;
  const ctx = mask.getContext('2d', {willReadFrequently: true});

  function block(x, y, w, h, radius, value) {
    ctx.fillStyle = 'rgb(' + value + ' ' + value + ' ' + value + ')';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, radius);
    } else {
      const r = Math.min(radius, w / 2, h / 2);
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    ctx.fill();
  }

  // Face-on tablet. The camera and home indicator are openings in the dust.
  block(1, 1, 364, 236, 17, 159);
  block(6, 6, 354, 225, 11, 0);
  block(181, 2, 4, 3, 1.5, 0);
  block(160, 233, 46, 2, 1, 22);

  // Shared navigation above three independently aligned areas of the TRS workspace.
  if (brand) {
    // Only the emblem's silhouette is sampled. Two short bars suggest its wordmark.
    ctx.globalAlpha = .69;
    ctx.drawImage(brand, 18, 12, 16, 17);
    ctx.globalAlpha = 1;
    block(39, 16, 27, 3, 1, 169);
    block(39, 22, 19, 2, 1, 139);
  }
  block(110, 19, 22, 4, 1, 125);
  block(141, 19, 20, 4, 1, 105);
  block(319, 18, 23, 6, 2, 163);
  block(15, 34, 336, 2, 1, 122);
  block(169, 46, 2, 168, 1, 109);
  block(251, 46, 2, 168, 1, 109);

  // Positions grid: a tab and three column headers, followed by aligned account rows.
  block(18, 46, 36, 7, 1, 216);
  block(61, 48, 23, 4, 1, 130);
  block(18, 59, 35, 2, 1, 172);
  // Instrument filter and query button on the positions toolbar.
  block(99, 45, 39, 11, 2, 154);
  block(101, 47, 35, 7, 1, 0);
  block(104, 49, 12, 3, 1, 164);
  block(142, 45, 14, 11, 2, 177);
  block(18, 72, 30, 4, 1, 137);
  block(87, 72, 18, 4, 1, 137);
  block(131, 72, 25, 4, 1, 137);
  block(18, 82, 139, 2, 1, 112);
  const positions = [[37, 19, 23], [29, 25, 17], [41, 16, 29], [31, 22, 20], [35, 14, 26]];
  positions.forEach(([symbol, quantity, price], row) => {
    const y = 91 + row * 23;
    block(18, y, symbol, 8, 1, 187);
    block(18, y + 10, Math.round(symbol * .55), 4, 1, 127);
    block(18, y + 19, 138, 1, 0, 101);
    block(108 - quantity, y, quantity, 8, 1, 161);
    block(156 - price, y, price, 8, 1, 177);
  });

  // Mirrored volume bars share a centre gutter so both sides read as one order book.
  block(179, 46, 32, 7, 1, 200);
  block(220, 46, 10, 6, 2, 186);
  block(233, 46, 9, 6, 2, 123);
  block(180, 72, 22, 4, 1, 137);
  block(218, 72, 23, 4, 1, 137);
  block(179, 82, 64, 2, 1, 112);
  const depth = [[9, 27], [12, 25], [15, 23], [17, 20], [20, 17], [23, 14], [25, 11], [27, 8]];
  depth.forEach(([bid, ask], row) => {
    const y = 100 + row * 13;
    block(208 - bid, y, bid, 9, 1, 195);
    block(216, y, ask, 9, 1, 159);
  });

  // Order ticket: separate field labels, bounded entry areas, and two action buttons.
  block(262, 46, 37, 7, 1, 208);
  for (const [y, valueWidth] of [[72, 27], [110, 38]]) {
    block(262, y, 20, 4, 1, 142);
    block(262, y + 9, 83, 19, 3, 130);
    block(264, y + 11, 79, 15, 2, 5);
    block(269, y + 15, valueWidth, 7, 1, 174);
  }
  block(262, 155, 20, 4, 1, 142);
  block(262, 170, 82, 2, 1, 134);
  block(262, 170, 35, 2, 1, 205);
  for (const x of [262, 282, 302, 322, 342]) block(x, 175, 2, 3, 1, 143);
  block(294, 167, 7, 7, 3, 202);
  for (const x of actionLeft) block(x, actionTop, actionWidth, actionHeight, 2, 204);

  return ctx.getImageData(0, 0, width, height).data;
}

export function sampleTablet(count, random, pixels = tabletMask()) {
  const {width, height} = tabletSize;
  const mass = new Float64Array(width * height);
  let total = 0;
  for (let i = 0; i < mass.length; i++) {
    const x = i % width, y = Math.floor(i / width);
    // The crest on the logo and the upper left of the device catch the same soft light.
    const exposure = .84 + .33 * Math.exp(-((x - 85) ** 2 + (y - 37) ** 2) / 4900);
    const bezel = x < 9 || x > 356 || y < 10 || y > 222;
    const rimLight = bezel ? .70 + .55 * (1 - x / width) * (1 - y / height) : 1;
    total += (pixels[i * 4] / 160) ** 1.36 * (pixels[i * 4 + 3] / 255) * exposure * rimLight;
    mass[i] = total;
  }
  const points = [];
  let cell = 0;
  for (let n = 0; n < count; n++) {
    const quota = (n + random()) * total / count;
    while (cell + 1 < mass.length && mass[cell] <= quota) cell++;
    const x = cell % width, y = Math.floor(cell / width);
    const rim = x < 8 || x > width - 9 || y < 9 || y > height - 15;
    const halo = rim && random() < .09 ? random() * 2.7 : 0;
    const angle = halo ? random() * Math.PI * 2 : 0;
    points.push({
      x: x + random() + (264 - width) / 2 + halo * Math.cos(angle),
      y: y + random() + (277 - height) / 2 + halo * Math.sin(angle),
      ink: pixels[cell * 4] / 255,
      action: actionAt(x, y),
      rimDirection: rim ? Math.atan2(y - Math.max(17, Math.min(height - 17, y)),
        x - Math.max(17, Math.min(width - 17, x))) + Math.PI / 2 : 0,
    });
  }
  // Sample crowded highlights in random order so the separated dots do not form scan lines.
  const candidates = points.slice();
  const bezelSpacing = createGrainSpacing(2.28);
  const interfaceSpacing = createGrainSpacing(1.28);
  for (let n = candidates.length; n > 0; n--) {
    const pick = Math.floor(random() * n);
    const point = candidates[pick];
    candidates[pick] = candidates[n - 1];
    const x = point.x - (264 - width) / 2, y = point.y - (277 - height) / 2;
    const rim = x < 9 || x > width - 10 || y < 10 || y > height - 16;
    const reserve = rim ? bezelSpacing : interfaceSpacing;
    point.visible = random() < .08 + .86 * point.ink && reserve(point.x, point.y);
  }
  return points;
}
