// Each cell holds at most one grain. Neighbour checks also keep gaps across cell boundaries.
export function createGrainSpacing(spacing) {
  const occupied = new Map();
  const rowStride = 65536; // Both masks fit comfortably within a row, including their fringe.
  const distanceSquared = spacing * spacing;
  return (x, y) => {
    const col = Math.floor(x / spacing), row = Math.floor(y / spacing);
    const key = row * rowStride + col;
    if (occupied.has(key)) return false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const near = occupied.get(key + dy * rowStride + dx);
        if (near && (x - near.x) ** 2 + (y - near.y) ** 2 < distanceSquared) return false;
      }
    }
    occupied.set(key, {x, y});
    return true;
  };
}
