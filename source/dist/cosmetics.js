import { BACKGROUNDS, BASKETS } from './catalog.js';

const backgroundIds = new Set(BACKGROUNDS.map(background => background.id));
const basketIds = new Set(BASKETS.map(basket => basket.id));
const PALETTES = {
  default: {
    light: { background: '#fffdf3', dots: '#dfe5d0', line: '#b7c2a2', text: '#718064' },
    dark: { background: '#192e2b', dots: '#314a40', line: '#7f9680', text: '#c6d6be' },
  },
  sunset: {
    light: { background: '#fff0df', dots: '#e7c3af', line: '#ca9c86', text: '#8b6657' },
    dark: { background: '#382b39', dots: '#694957', line: '#bd9197', text: '#f0c8ba' },
  },
  forest: {
    light: { background: '#eef4e7', dots: '#c5d8b7', line: '#8fa77e', text: '#5a7650' },
    dark: { background: '#172d24', dots: '#36543d', line: '#83a17b', text: '#c7d6b9' },
  },
  ocean: {
    light: { background: '#eaf7f7', dots: '#bcdfe2', line: '#7aadb7', text: '#4e7d86' },
    dark: { background: '#172f3d', dots: '#31566b', line: '#7faebe', text: '#c0dce4' },
  },
  night: {
    light: { background: '#f0f0fb', dots: '#cfd0ea', line: '#a0a3cd', text: '#74749c' },
    dark: { background: '#20253d', dots: '#3c4468', line: '#969fc8', text: '#d2d6f0' },
  },
};
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const dimensionsValid = (width, height) => Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
const safeTime = time => Number.isFinite(time) ? time : 0;
const backgroundId = id => backgroundIds.has(id) && Object.hasOwn(PALETTES, id) ? id : 'default';

/** Colors shared by the backdrop, MAX line, aiming guide, and small board text. */
export function getCosmeticPalette(id = 'default', theme = 'light') {
  return { ...PALETTES[backgroundId(id)][theme === 'dark' ? 'dark' : 'light'] };
}

function roundedPath(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function star(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.lineTo(x + radius * .28, y - radius * .28);
  ctx.lineTo(x + radius, y);
  ctx.lineTo(x + radius * .28, y + radius * .28);
  ctx.lineTo(x, y + radius);
  ctx.lineTo(x - radius * .28, y + radius * .28);
  ctx.lineTo(x - radius, y);
  ctx.lineTo(x - radius * .28, y - radius * .28);
  ctx.closePath(); ctx.fill();
}

function cloud(ctx, x, y, width, height) {
  ctx.beginPath();
  ctx.moveTo(x - width * .5, y + height * .2);
  ctx.bezierCurveTo(x - width * .59, y - height * .35, x - width * .23, y - height * .6, x - width * .12, y - height * .35);
  ctx.bezierCurveTo(x, y - height * .94, x + width * .35, y - height * .67, x + width * .34, y - height * .2);
  ctx.bezierCurveTo(x + width * .65, y - height * .22, x + width * .62, y + height * .3, x + width * .4, y + height * .32);
  ctx.lineTo(x - width * .32, y + height * .32);
  ctx.quadraticCurveTo(x - width * .5, y + height * .34, x - width * .5, y + height * .2);
  ctx.closePath(); ctx.fill();
}

function leaf(ctx, x, y, length, rotation) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-length * .22, -length * .25, -length * .18, -length * .79, 0, -length);
  ctx.bezierCurveTo(length * .42, -length * .67, length * .32, -length * .24, 0, 0);
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function sunset(ctx, width, height, time, dark) {
  const size = Math.min(width, height);
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, dark ? '#493144' : '#fff4e5');
  gradient.addColorStop(.58, dark ? '#3c2c39' : '#fff0df');
  gradient.addColorStop(1, dark ? '#603c48' : '#f6d6bd');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.globalAlpha *= dark ? .24 : .28;
  ctx.fillStyle = dark ? '#efa886' : '#edb88b';
  ctx.beginPath(); ctx.arc(width * .83, height * .13, size * .075, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha *= .8; ctx.fillStyle = dark ? '#bc8799' : '#ffffff';
  cloud(ctx, width * .13, height * .105, width * .22, size * .042);
  cloud(ctx, width * .89, height * .23, width * .16, size * .035);
  ctx.restore();
  ctx.save(); ctx.globalAlpha *= dark ? .12 : .15;
  ctx.fillStyle = dark ? '#d88a8c' : '#dfa287';
  ctx.beginPath(); ctx.moveTo(0, height * .91);
  ctx.bezierCurveTo(width * .19, height * .84, width * .33, height * .96, width * .54, height * .91);
  ctx.bezierCurveTo(width * .77, height * .85, width * .88, height * .91, width, height * .88);
  ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark ? '#efad96' : '#fff6df';
  ctx.beginPath(); ctx.moveTo(0, height * .96);
  ctx.bezierCurveTo(width * .35, height * .89, width * .69, height * .99, width, height * .94);
  ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill(); ctx.restore();
}

function forest(ctx, width, height, time, dark) {
  const size = Math.min(width, height);
  const gradient = ctx.createLinearGradient(0, 0, width * .7, height);
  gradient.addColorStop(0, dark ? '#20392b' : '#f4f8ed');
  gradient.addColorStop(.6, dark ? '#172d24' : '#eef4e7');
  gradient.addColorStop(1, dark ? '#213e2d' : '#e0ebd4');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.fillStyle = dark ? '#a6c583' : '#8eaf72'; ctx.globalAlpha *= dark ? .11 : .12;
  const sway = Math.sin(time * .35) * .035;
  for (const side of [0, 1]) {
    const x = side ? width + size * .018 : -size * .018;
    const direction = side ? -1 : 1;
    leaf(ctx, x, height * .09, size * .16, direction * .82 + sway);
    leaf(ctx, x, height * .19, size * .15, direction * 1.25 + sway);
    leaf(ctx, x, height * .32, size * .115, direction * 1.45 + sway);
    leaf(ctx, x, height * .82, size * .1, direction * .68 - sway);
    leaf(ctx, x, height * .94, size * .13, direction * 1.16 - sway);
  }
  ctx.strokeStyle = dark ? '#b4cd91' : '#8caa72'; ctx.lineWidth = clamp(size * .002, .7, 1.3); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(width * .025, height * .04);
  ctx.bezierCurveTo(width * .06, height * .14, width * .015, height * .26, width * .025, height * .35);
  ctx.moveTo(width * .975, height * .67);
  ctx.bezierCurveTo(width * .93, height * .78, width * .99, height * .88, width * .96, height * .96); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.globalAlpha *= dark ? .13 : .16; ctx.fillStyle = dark ? '#d0dcac' : '#ffffff';
  for (let index = 0; index < 9; index++) {
    const x = index % 2 ? width * .94 : width * .065;
    const y = height * (.13 + index * .09);
    ctx.beginPath(); ctx.arc(x + Math.sin(index * 2.3) * size * .016, y, clamp(size * .004, .65, 2), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function ocean(ctx, width, height, time, dark) {
  const size = Math.min(width, height);
  const gradient = ctx.createLinearGradient(0, 0, width * .2, height);
  gradient.addColorStop(0, dark ? '#1c3b4a' : '#f0fbfa');
  gradient.addColorStop(.6, dark ? '#172f3d' : '#eaf7f7');
  gradient.addColorStop(1, dark ? '#1f4253' : '#d3ecf0');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.strokeStyle = dark ? '#a1d7df' : '#7fbfc9'; ctx.lineWidth = clamp(size * .0016, .6, 1); ctx.globalAlpha *= dark ? .16 : .21;
  for (let index = 0; index < 14; index++) {
    const side = index % 2;
    const x = width * (side ? .96 : .04) + Math.sin(index * 2.1 + time * .18) * size * .012;
    const y = height * (.08 + (index % 7) * .135);
    const r = clamp(size * (.007 + index % 3 * .004), 1.6, 8);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - r * .25, y - r * .3, r * .2, Math.PI, Math.PI * 1.7); ctx.stroke();
  }
  ctx.globalAlpha *= .8; ctx.strokeStyle = dark ? '#a1e1d7' : '#ffffff'; ctx.lineWidth = clamp(size * .003, 1, 2);
  const drift = Math.sin(time * .25) * height * .008;
  for (let index = 0; index < 3; index++) {
    const y = height * (.87 + index * .04) + drift;
    ctx.beginPath(); ctx.moveTo(-width * .05, y);
    ctx.bezierCurveTo(width * .14, y - height * .035, width * .32, y + height * .035, width * .52, y);
    ctx.bezierCurveTo(width * .72, y - height * .035, width * .86, y + height * .025, width * 1.04, y - height * .012); ctx.stroke();
  }
  ctx.restore();
}

function night(ctx, width, height, time, dark) {
  const size = Math.min(width, height);
  const gradient = ctx.createLinearGradient(0, 0, width * .7, height);
  gradient.addColorStop(0, dark ? '#292c4c' : '#f0effa');
  gradient.addColorStop(.55, dark ? '#20253d' : '#f0f0fb');
  gradient.addColorStop(1, dark ? '#30314d' : '#e5e8f7');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.fillStyle = dark ? '#e5dcac' : '#c8c5e3'; ctx.globalAlpha *= dark ? .38 : .5;
  const x = width * .855, y = height * .125, r = size * .055;
  ctx.beginPath(); ctx.moveTo(x + r * .35, y - r * .95);
  ctx.bezierCurveTo(x - r * 1.1, y - r * 1.1, x - r * 1.2, y + r * .65, x - r * .1, y + r * .96);
  ctx.bezierCurveTo(x + r * .5, y + r * 1.15, x + r * .98, y + r * .6, x + r * .99, y + r * .12);
  ctx.bezierCurveTo(x + r * .12, y + r * .48, x - r * .3, y - r * .35, x + r * .35, y - r * .95);
  ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.save(); ctx.fillStyle = dark ? '#ece9cc' : '#aba9cd';
  const inheritedAlpha = ctx.globalAlpha;
  for (let index = 0; index < 29; index++) {
    const px = width * (.045 + ((index * 37 + 13) % 91) / 100);
    const py = height * (.035 + ((index * 23 + 7) % 94) / 100);
    const atEdge = px < width * .14 || px > width * .86 || py < height * .12 || py > height * .91;
    const pulse = .78 + .22 * Math.sin(time * .7 + index * 1.7);
    ctx.globalAlpha = inheritedAlpha * (atEdge ? .4 : .13) * pulse;
    const radius = clamp(size * (index % 6 === 0 ? .005 : .0025), .55, index % 6 === 0 ? 2.7 : 1.3);
    if (index % 6 === 0) star(ctx, px, py, radius);
    else { ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

/** Decorative backgrounds are independent of the game's water/space physics modes. */
export function drawCosmeticBackdrop(ctx, id = 'default', width, height, time = 0, theme = 'light') {
  id = backgroundId(id);
  const palette = getCosmeticPalette(id, theme);
  if (!dimensionsValid(width, height)) return palette;
  ctx.save();
  try {
    ctx.fillStyle = palette.background; ctx.fillRect(0, 0, width, height);
    const painter = { sunset, forest, ocean, night }[id];
    if (painter) painter(ctx, width, height, safeTime(time), theme === 'dark');
  } finally { ctx.restore(); }
  return palette;
}

/** An inset, thin rim leaves the entire fruit pile readable. */
export function drawBasketFrame(ctx, id = 'classic', width, height, time = 0) {
  if (!dimensionsValid(width, height)) return;
  id = basketIds.has(id) ? id : 'classic';
  const size = Math.min(width, height), inset = clamp(size * .014, 4, 8), radius = clamp(size * .04, 8, 24);
  if (width <= inset * 2 || height <= inset * 2) return;
  const rim = (offset = 0) => roundedPath(ctx, inset + offset, inset + offset, width - (inset + offset) * 2, height - (inset + offset) * 2, Math.max(2, radius - offset));
  ctx.save();
  try {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (id === 'wood') {
      ctx.strokeStyle = '#a78154'; ctx.lineWidth = clamp(size * .009, 3.2, 5.5); rim(); ctx.stroke();
      ctx.strokeStyle = '#e0bc7f'; ctx.lineWidth = 1; rim(1.6); ctx.stroke();
      ctx.strokeStyle = '#785e40'; ctx.lineWidth = .7; ctx.globalAlpha *= .45;
      for (const edge of [inset - .8, width - inset + .8]) {
        ctx.beginPath(); ctx.moveTo(edge, height * .18); ctx.lineTo(edge, height * .38);
        ctx.moveTo(edge, height * .5); ctx.quadraticCurveTo(edge - 1.1, height * .64, edge, height * .82); ctx.stroke();
      }
      for (const fraction of [.23, .49, .77]) {
        const x = width * fraction;
        ctx.beginPath(); ctx.moveTo(x, inset - 1.3); ctx.lineTo(x + 2.5, inset + 1.3);
        ctx.moveTo(x + width * .05, height - inset - 1.3); ctx.lineTo(x + width * .05 + 2.5, height - inset + 1.3); ctx.stroke();
      }
    } else if (id === 'bubble') {
      ctx.strokeStyle = '#83bec7'; ctx.lineWidth = clamp(size * .004, 1.3, 2.2); rim(); ctx.stroke();
      ctx.fillStyle = 'rgba(184,230,235,.27)'; ctx.strokeStyle = '#a4d6dc'; ctx.lineWidth = .75;
      for (let index = 0; index < 10; index++) {
        const x = index % 2 ? width - inset : inset;
        const y = height * (.12 + Math.floor(index / 2) * .19);
        const r = clamp(size * (.008 + index % 3 * .002), 1.8, 6.5);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.8)';
        ctx.beginPath(); ctx.arc(x - r * .15, y - r * .15, r * .6, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke(); ctx.restore();
      }
    } else if (id === 'gold') {
      const metal = ctx.createLinearGradient(0, 0, width, height);
      metal.addColorStop(0, '#af8139'); metal.addColorStop(.28, '#f2d48b'); metal.addColorStop(.51, '#bd9145'); metal.addColorStop(.76, '#f5dda0'); metal.addColorStop(1, '#ae813b');
      ctx.strokeStyle = metal; ctx.lineWidth = clamp(size * .006, 2.1, 3.6); rim(); ctx.stroke();
      ctx.strokeStyle = '#dbbd78'; ctx.lineWidth = .9; rim(3.1); ctx.stroke();
      ctx.fillStyle = '#c49c4b';
      for (const [x, y] of [[inset + 5, inset + 5], [width - inset - 5, inset + 5], [inset + 5, height - inset - 5], [width - inset - 5, height - inset - 5]]) star(ctx, x, y, clamp(size * .006, 1.3, 3.1));
    } else if (id === 'aurora') {
      const shift = Math.sin(safeTime(time) * .25) * size * .12;
      const light = ctx.createLinearGradient(shift, 0, width - shift, height);
      light.addColorStop(0, '#80cfc5'); light.addColorStop(.25, '#b7b6e9'); light.addColorStop(.5, '#e5b0d0'); light.addColorStop(.75, '#a6d9cc'); light.addColorStop(1, '#acbfee');
      ctx.strokeStyle = light; ctx.lineWidth = clamp(size * .0065, 2.2, 3.8); ctx.shadowColor = 'rgba(151,213,213,.5)'; ctx.shadowBlur = clamp(size * .01, 2, 6); rim(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = .8; rim(2.5); ctx.stroke();
      ctx.save(); ctx.fillStyle = '#f5f3da'; ctx.globalAlpha *= .7;
      star(ctx, width * .25, inset, clamp(size * .006, 1.3, 2.7));
      star(ctx, width * .73, height - inset, clamp(size * .0045, 1, 2)); ctx.restore();
    } else {
      ctx.strokeStyle = '#879d77'; ctx.lineWidth = clamp(size * .0025, 1, 1.5); rim(); ctx.stroke();
    }
  } finally { ctx.restore(); }
}

export function drawCosmeticPreview(ctx, { background = 'default', basket = 'classic', theme = 'light', width = 220, height = 124, time = 0 } = {}) {
  const palette = drawCosmeticBackdrop(ctx, background, width, height, time, theme);
  drawBasketFrame(ctx, basket, width, height, time);
  return palette;
}
