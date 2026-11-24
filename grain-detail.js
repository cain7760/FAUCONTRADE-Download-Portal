// The assembled forms are cached at native resolution. Place them on the physical pixel grid.
export function drawPlate(ctx, plate, x, y, width, height) {
  const m = ctx.getTransform();
  if (Math.abs(m.a * width - plate.width) > .75 || Math.abs(m.d * height - plate.height) > .75) {
    ctx.drawImage(plate, x, y, width, height);
    return;
  }
  ctx.save();
  ctx.resetTransform();
  ctx.drawImage(plate, Math.round(m.e + x * m.a), Math.round(m.f + y * m.d));
  ctx.restore();
}
