export function horizontalChoiceIndex(key, current, count) {
  switch (key) {
    case 'Home': return 0;
    case 'End': return count - 1;
    case 'ArrowLeft': return (current + count - 1) % count;
    case 'ArrowRight': return (current + 1) % count;
    default: return -1;
  }
}
