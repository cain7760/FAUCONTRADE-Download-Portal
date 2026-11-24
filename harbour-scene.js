// The quay is 82% down the source photograph, before any responsive cover crop.
const SHORELINE = 0.82;

export async function createHarbourScene() {
  const photo = new Image();
  photo.src = new URL('./assets/scene-hong-kong.webp', import.meta.url).href;
  await photo.decode();
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;

  function rippleWater(ctx, width, height, scale, left, top, shore, time) {
    const entrance = Math.min(1, time / 0.8);
    const waterHeight = ih * (1 - SHORELINE) * scale;
    const columns = Math.max(2, Math.ceil(width / 180));
    // Draw into integer backing-pixel rectangles so adjacent cells share an exact edge.
    const pixelWidth = ctx.canvas.width;
    const pixelHeight = ctx.canvas.height;
    const ratioX = pixelWidth / width;
    const ratioY = pixelHeight / height;
    const rowHeight = Math.max(1, Math.round(2 * ratioY));
    const firstRow = Math.max(0, Math.ceil(shore * ratioY));
    function sampleY(y) {
      const depth = Math.min(1, Math.max(0, (y - shore) / waterHeight));
      const heave = Math.sin(Math.PI * depth) * Math.sin(17 * depth - 1.25 * time);
      return (y - top) / scale + ih * 0.0028 * entrance * heave;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    let sy = sampleY(firstRow / ratioY);
    for (let y = firstRow; y < pixelHeight; y += rowHeight) {
      const bottom = Math.min(y + rowHeight, pixelHeight);
      const nextY = sampleY(bottom / ratioY);
      const depth = ((y + bottom) / (2 * ratioY) - shore) / waterHeight;
      // Distant reflections barely move. Long swells and shorter ripples overlap
      // in the foreground, bending the lights already present in the water.
      const phase = depth * (26 - 9 * depth);
      const amplitude = iw * 0.0048 * depth * entrance;
      let x = 0;
      let sx = -left / scale;
      for (let col = 1; col <= columns; col++) {
        const right = Math.round(pixelWidth * col / columns);
        const u = right / pixelWidth;
        const drift = Math.sin(phase + 5 * u - 1.5 * time) +
          0.34 * Math.sin(2.1 * phase - 8 * u + 2.05 * time);
        const nextX = (right / ratioX - left) / scale +
          amplitude * Math.sin(Math.PI * u) * drift;
        ctx.drawImage(photo, sx, sy, nextX - sx, nextY - sy, x, y, right - x, bottom - y);
        x = right;
        sx = nextX;
      }
      sy = nextY;
    }
    ctx.restore();
  }

  return (ctx, width, height, time) => {
    const scale = Math.max(width / iw, height / ih);
    const left = (width - iw * scale) / 2;
    // Anchor the quay at the same relative height even on an ultrawide display.
    const top = (height - ih * scale) * SHORELINE;
    const shore = top + ih * SHORELINE * scale;
    ctx.drawImage(photo, left, top, iw * scale, ih * scale);
    if (time && shore < height) rippleWater(ctx, width, height, scale, left, top, shore, time);
  };
}
