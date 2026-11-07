/** Keep the complete, formatted number visible without changing its text. */
const originals = new WeakMap();

function desiredFont(element, computed) {
  if (!originals.has(element)) originals.set(element, element.style.fontSize || '');
  const explicit = Number.parseFloat(element.dataset?.numberMaxSize);
  if (Number.isFinite(explicit) && explicit > 0) return `${explicit}px`;
  if (computed.getPropertyValue('--number-max-size').trim()) return 'var(--number-max-size)';
  return originals.get(element);
}

export function fitNumericText(element) {
  if (!element?.style || !element.getClientRects().length || element.clientWidth <= 1) return null;
  let computed = getComputedStyle(element);
  // Always restore the CSS baseline first, including responsive breakpoint changes.
  // A previously fitted size must never become the next update's maximum size.
  element.style.fontSize = desiredFont(element, computed);
  computed = getComputedStyle(element);
  const maximum = Number.parseFloat(computed.fontSize);
  if (!Number.isFinite(maximum) || maximum <= 0) return null;
  const padding = (Number.parseFloat(computed.paddingLeft) || 0) + (Number.parseFloat(computed.paddingRight) || 0);
  const available = element.clientWidth - padding;
  if (available <= 1) return maximum;
  let size = maximum;
  // Fixed-size children, such as POINTS, need another measurement after shrinking.
  for (let attempt = 0; attempt < 12 && element.scrollWidth > element.clientWidth; attempt++) {
    const content = Math.max(1, element.scrollWidth - padding);
    const next = Math.max(.5, size * Math.max(.01, available - 1) / content * .99);
    if (next >= size || Math.abs(next - size) < .001) break;
    size = next;
    element.style.fontSize = `${size}px`;
  }
  return size;
}

/** Call once for numeric elements; call fitNumericText again after changing text. */
export function observeNumericText(elements) {
  const list = [...new Set(Array.from(elements || []).filter(Boolean))];
  let stopped = false, queued = false, frame = null;
  const requestFrame = globalThis.requestAnimationFrame || (callback => setTimeout(callback, 0));
  const cancelFrame = globalThis.cancelAnimationFrame || clearTimeout;
  const schedule = () => {
    if (stopped || queued) return;
    queued = true;
    frame = requestFrame(() => {
      queued = false;
      if (!stopped) list.forEach(fitNumericText);
    });
  };
  const widths = new WeakMap();
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => {
    let changed = false;
    for (const entry of entries) {
      const width = entry.contentRect.width;
      const previous = widths.get(entry.target);
      widths.set(entry.target, width);
      // Font fitting changes height. Only width/visibility changes should refit it.
      if (previous === undefined || Math.abs(width - previous) > .25) changed = true;
    }
    if (changed) schedule();
  }) : null;
  for (const element of list) {
    observer?.observe(element);
    if (element.parentElement) observer?.observe(element.parentElement);
  }
  globalThis.addEventListener?.('resize', schedule);
  document.fonts?.ready?.then(schedule).catch(() => {});
  document.fonts?.addEventListener?.('loadingdone', schedule);
  schedule();
  return () => {
    stopped = true;
    observer?.disconnect();
    globalThis.removeEventListener?.('resize', schedule);
    document.fonts?.removeEventListener?.('loadingdone', schedule);
    if (queued) cancelFrame(frame);
  };
}
