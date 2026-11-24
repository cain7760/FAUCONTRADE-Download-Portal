// Soft patches sample the existing photograph. All bounds are in the 1000 x 400 proof:
// cloud patches stay clear of the orbit and skyline; water patches flank the causeway.
const cloudPatches = [
  [0, 260, 222, 45], [272, 249, 193, 48], [455, 158, 96, 26],
  [845, 190, 155, 49], [855, 239, 123, 28],
];
const landscapes = {
  'falcon-orbit': {clouds: cloudPatches, water: [[0, 318, 577, 82], [825, 319, 175, 81]]},
  'order-corridor': {
    // Follow the cloud bank up the skyline; the last patch is in the sunlit gap.
    clouds: [[343, 236, 164, 51], [464, 220, 129, 60], [549, 191, 77, 48],
      [603, 170, 57, 54], [779, 162, 21, 85]],
    waterAmplitude: 1.3,
    water: [[0, 310, 610, 90], [588, 329, 205, 71], [746, 342, 254, 58]],
  },
};

function samplePatch(image, [x, y, width, height], exposure) {
  const canvas = document.createElement('canvas');
  const sx = image.naturalWidth / 1000, sy = image.naturalHeight / 400;
  canvas.width = Math.ceil(width * sx);
  canvas.height = Math.ceil(height * sy);
  const ctx = canvas.getContext('2d');
  ctx.scale(canvas.width / width, canvas.height / height);
  ctx.drawImage(image, -x, -y, 1000, 400);
  // Match the poster exposure once; orbital highlights keep their own luminance.
  ctx.fillStyle = 'rgba(0,0,0,' + (1 - exposure) + ')';
  ctx.fillRect(0, 0, width, height);
  ctx.translate(width / 2, height / 2);
  ctx.scale(width / 2, height / 2);
  const mask = ctx.createRadialGradient(0, 0, .28, 0, 0, 1);
  mask.addColorStop(0, '#000');
  mask.addColorStop(1, 'transparent');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = mask;
  ctx.fillRect(-1, -1, 2, 2);
  return {canvas, x, y, width, height};
}

export function createAtmosphere(sceneName) {
  const patches = landscapes[sceneName];
  if (!patches) return null;
  const waterAmplitude = patches.waterAmplitude ?? 1;
  let clouds, water;
  return (ctx, frame, time) => {
    if (!time) return;
    if (!clouds) {
      const image = ctx.canvas.parentElement?.querySelector('img');
      if (!image?.complete || !image.naturalWidth || !image.currentSrc.endsWith('/' + sceneName + '.webp')) return;
      const exposure = parseFloat(getComputedStyle(image).getPropertyValue('--orbit-exposure')) || 1;
      clouds = patches.clouds.map(box => samplePatch(image, box, exposure));
      water = patches.water.map(box => samplePatch(image, box, exposure));
    }
    ctx.save();
    ctx.globalAlpha *= Math.min(1, time);
    ctx.translate(frame.left, frame.top);
    ctx.scale(frame.photoW / 1000, frame.photoH / 400);
    for (const [i, patch] of clouds.entries()) {
      const shift = Math.sin(time * (.16 + i * .013));
      ctx.drawImage(patch.canvas, patch.x + 2.1 * shift, patch.y - .32 * shift, patch.width, patch.height);
    }
    for (const patch of water) {
      const rows = patch.canvas.height;
      let prevY = 0;
      for (let top = 0; top < rows; top += 6) {
        const end = Math.min(top + 6, rows);
        const y = patch.height * end / rows;
        const phase = y * .19 + patch.x * .013;
        const dy = .55 * waterAmplitude * (Math.sin(phase + time * .82) - Math.sin(phase));
        const dx = .66 * waterAmplitude * (Math.sin(phase * .6 + time * .65) - Math.sin(phase * .6));
        ctx.drawImage(patch.canvas, 0, top, patch.canvas.width, end - top,
          patch.x + dx, patch.y + prevY, patch.width, y + dy - prevY);
        prevY = y + dy;
      }
    }
    ctx.restore();
  };
}
