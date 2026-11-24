// Coordinates in a 1000 × 400 proof of the falcon landscape.
const tau = 2 * Math.PI;
const tilt = -15 * Math.PI / 180;
const cx = 697, cy = 190, rx = 236, ry = 52;
const cosTilt = Math.cos(tilt), sinTilt = Math.sin(tilt);
// The back arc enters the left shoulder and emerges at the upper-right crown.
// These crossings are on solid metal; the openings in the face lie below this arc.
const enters = 239.9 * Math.PI / 180, emerges = 297.6 * Math.PI / 180;
const frontStops = [[560, 1], [578, .75], [595, .4], [802, .4], [819, .75], [837, 1]];
const normalize = angle => (angle % tau + tau) % tau;

export function falconOrbitPoint(angle) {
  const a = normalize(angle), u = rx * Math.cos(a), v = ry * Math.sin(a);
  const x = cx + u * cosTilt - v * sinTilt, y = cy + u * sinTilt + v * cosTilt;
  let alpha = 1;
  if (a > Math.PI) {
    // Let a bead slip behind the silhouette over roughly its own diameter.
    alpha = Math.max(0, Math.min(1, Math.max(enters - a, a - emerges) / .012));
  } else {
    for (let i = 1; i < frontStops.length; i++) {
      const [x0, a0] = frontStops[i - 1], [x1, a1] = frontStops[i];
      if (x >= x0 && x <= x1) {
        alpha = a0 + (a1 - a0) * (x - x0) / (x1 - x0);
        break;
      }
    }
  }
  return {x, y, alpha};
}

// Paint onto the clean photograph once when exporting falcon-orbit.webp.
// The gallery and the portal show this same continuous track even without animation.
export function paintFalconRing(ctx, width, height) {
  ctx.save();
  ctx.scale(width / 1000, height / 400);
  ctx.lineWidth = .86;
  const gold = alpha => 'rgba(247, 198, 137, ' + (.72 * alpha) + ')';
  const front = ctx.createLinearGradient(0, 0, 1000, 0);
  for (const [x, alpha] of frontStops) front.addColorStop(x / 1000, gold(alpha));
  ctx.strokeStyle = front;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, tilt, 0, Math.PI);
  ctx.stroke();
  ctx.strokeStyle = gold(1);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, tilt, Math.PI, enters);
  ctx.moveTo(falconOrbitPoint(emerges).x, falconOrbitPoint(emerges).y);
  ctx.ellipse(cx, cy, rx, ry, tilt, emerges, tau);
  ctx.stroke();
  ctx.restore();
}
