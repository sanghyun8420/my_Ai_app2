/** Preserve the 600×720 playfield while fitting the controls into the viewport. */
export function playArrangement(width, height) {
  if (width >= 540 && width > height && height <= 540) return 'landscape';
  return width >= 900 ? 'wide' : 'stack';
}

export function fitBasketSize({ width, height, header = 0, overhead = 0, rail = 42, tools = 0, gap = 12, bottom = 10 }) {
  const boardSpace = Math.max(1, width - rail - 5 - (tools ? tools + gap : 0));
  const heightSpace = Math.max(1, height - header - overhead - bottom);
  const board = Math.max(1, Math.floor(Math.min(650, boardSpace, heightSpace * 5 / 6)));
  const basket = board + rail + 5;
  return { board, basket, width: basket + (tools ? tools + gap : 0), height: board * 6 / 5 };
}

export function mountPlayLayout() {
  const layout = document.querySelector('.game-layout'), play = layout?.querySelector('.play-column');
  const header = document.querySelector('.site-header'), main = layout?.parentElement;
  if (!layout || !play || !header || !main) return;
  const score = play.querySelector('.score-band'), status = play.querySelector('.board-top');
  const next = play.querySelector('.next-card'), tools = play.querySelector('.toolbelt'), room = play.querySelector('.room-panel');
  const px = value => Number.parseFloat(value) || 0;
  const boxHeight = element => {
    if (!element || element.hidden) return 0;
    const style = getComputedStyle(element);
    return element.getBoundingClientRect().height + px(style.marginTop) + px(style.marginBottom);
  };
  let queued = false;
  function update() {
    queued = false;
    if (layout.hidden || document.body.dataset.game && document.body.dataset.game !== 'suika') return;
    const height = globalThis.visualViewport?.height || globalThis.innerHeight;
    const width = document.documentElement.clientWidth || globalThis.innerWidth;
    if (!Number.isFinite(height) || !Number.isFinite(width) || height <= 0 || width <= 0) return;
    const arrangement = playArrangement(width, height);
    layout.dataset.arrangement = arrangement;
    const style = getComputedStyle(play), mainStyle = getComputedStyle(main);
    const availableWidth = Math.min(1250, main.clientWidth - px(mainStyle.paddingLeft) - px(mainStyle.paddingRight));
    const rail = arrangement === 'stack' ? (width <= 640 ? 38 : 54) : arrangement === 'landscape' ? 36 : 54;
    const panel = arrangement === 'wide' ? 180 : arrangement === 'landscape' ? 232 : 0;
    const padding = px(style.paddingTop) + px(style.paddingBottom);
    const overhead = arrangement === 'landscape' ? 0 : padding + boxHeight(score) + boxHeight(status) + boxHeight(next) + boxHeight(room) + (arrangement === 'stack' ? boxHeight(tools) : 0) + px(style.rowGap) * (arrangement === 'stack' ? 5 : 4);
    const result = fitBasketSize({ width:availableWidth, height, header:boxHeight(header) + px(mainStyle.paddingTop), overhead, rail, tools:panel });
    const values = { '--play-width':result.width, '--board-width':result.board, '--rail-width':rail, '--tools-width':panel };
    for (const [key, value] of Object.entries(values)) if (layout.style.getPropertyValue(key) !== value + 'px') layout.style.setProperty(key, value + 'px');
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  const sizes = new WeakMap();
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => {
    let changed = false;
    for (const entry of entries) {
      const size = `${Math.round(entry.contentRect.width)},${Math.round(entry.contentRect.height)}`;
      if (sizes.get(entry.target) !== size) { sizes.set(entry.target, size); changed = true; }
    }
    if (changed) schedule();
  }) : null;
  for (const element of [header, main, score, status, next, tools, room]) if (element) observer?.observe(element);
  if (typeof MutationObserver === 'function') {
    const visibility = new MutationObserver(schedule);
    visibility.observe(document.body, { attributes:true, attributeFilter:['data-game'] });
    if (room) visibility.observe(room, { attributes:true, attributeFilter:['hidden'] });
  }
  globalThis.addEventListener?.('resize', schedule);
  globalThis.visualViewport?.addEventListener?.('resize', schedule);
  globalThis.addEventListener?.('pageshow', schedule);
  document.fonts?.ready?.then(schedule).catch(() => {});
  schedule();
}
