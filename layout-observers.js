// Both the cover artwork and the translated overview can resize after their first paint.
export function observeSize(element, onSize) {
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(([entry]) => onSize(entry.contentRect));
    observer.observe(element);
    return () => observer.disconnect();
  }

  const measure = () => {
    if (element.isConnected) onSize(element.getBoundingClientRect());
  };
  measure();
  window.addEventListener('resize', measure);
  document.fonts?.ready.then(measure);
  return () => window.removeEventListener('resize', measure);
}

// Pause decorative work while its host is off screen.
export function observeVisibility(element, onChange) {
  if (window.IntersectionObserver) {
    const observer = new IntersectionObserver(([entry]) => onChange(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }

  let previous;
  function measure() {
    const rect = element.getBoundingClientRect();
    const visible = rect.bottom > 0 && rect.top < window.innerHeight;
    if (previous !== visible) onChange(visible);
    previous = visible;
  }
  measure();
  window.addEventListener('scroll', measure, { passive: true });
  window.addEventListener('resize', measure);
  return () => {
    window.removeEventListener('scroll', measure);
    window.removeEventListener('resize', measure);
  };
}
