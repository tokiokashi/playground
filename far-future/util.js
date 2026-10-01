// 描画とアニメーションの小物。
export const W = 800, H = 500;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const TAU = Math.PI * 2;

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// "#rrggbb" 同士を混ぜて "rgb()" を返す
export function mix(c1, c2, t) {
  const a = hex(c1), b = hex(c2);
  return `rgba(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))},${lerp(a[3], b[3], t)})`;
}
// [r, g, b, a] を返す
export function hex(c) {
  if (c.startsWith('rgb')) { const v = c.match(/[\d.]+/g).map(Number); return [v[0], v[1], v[2], v[3] ?? 1]; }
  const n = parseInt(c.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255, 1];
}
export const rgba = (c, a) => { const [r, g, b, a0] = hex(c); return `rgba(${r},${g},${b},${a * a0})`; };

// 画面が小さい時に文字だけ大きくする倍率
let textScale = 1;
export const setTextScale = s => { textScale = s; };
// 複数の色の折れ線補間。stops = [[x, "#color"], ...]
export function ramp(stops, x) {
  if (x <= stops[0][0]) return mix(stops[0][1], stops[0][1], 0);
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (x - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  }
  return mix(stops.at(-1)[1], stops.at(-1)[1], 0);
}
export function rampNum(stops, x) {
  if (x <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) return lerp(stops[i - 1][1], stops[i][1], (x - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  }
  return stops.at(-1)[1];
}

export function glow(ctx, x, y, r, color, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(0.25, rgba(color, a * 0.45));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

export function disc(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.fill();
}

// 光の当たった球(左上から光)
export function ball(ctx, x, y, r, c1, c2, light = [-0.4, -0.4]) {
  const g = ctx.createRadialGradient(x + r * light[0], y + r * light[1], r * 0.1, x, y, r);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  disc(ctx, x, y, r, g);
}

let starCache = null;
export function stars(ctx, alpha = 1, seed = 7, n = 260, area = [0, 0, W, H], t = 0) {
  const key = seed + ':' + n;
  if (!starCache || starCache.key !== key) {
    const r = rng(seed);
    starCache = { key, list: Array.from({ length: n }, () => [r(), r(), r() ** 3, r()]) };
  }
  for (const [u, v, m, ph] of starCache.list) {
    const x = area[0] + u * area[2], y = area[1] + v * area[3];
    const tw = 0.75 + 0.25 * Math.sin(t * 2 + ph * 40);
    ctx.fillStyle = `rgba(235,240,255,${alpha * (0.25 + 0.75 * m) * tw})`;
    ctx.fillRect(x, y, 0.8 + m * 1.6, 0.8 + m * 1.6);
  }
}

export function label(ctx, text, x, y, opt = {}) {
  ctx.save();
  ctx.font = `${opt.weight || 600} ${Math.round((opt.size || 15) * textScale)}px "Hiragino Sans","Yu Gothic",system-ui,sans-serif`;
  ctx.textAlign = opt.align || 'left';
  ctx.textBaseline = opt.base || 'middle';
  ctx.globalAlpha *= opt.alpha ?? 1;
  if (opt.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 4; }
  ctx.fillStyle = opt.color || '#e8edf8';
  // 画面の端からはみ出さないように寄せる
  const w = ctx.measureText(text).width, a = ctx.textAlign;
  const left = a === 'center' ? x - w / 2 : a === 'right' ? x - w : x;
  if (left < 6) x += 6 - left; else if (left + w > W - 6) x -= left + w - (W - 6);
  ctx.fillText(text, x, y);
  ctx.restore();
}

// 引き出し線つきの注記
export function callout(ctx, text, x, y, dx, dy, opt = {}) {
  ctx.save();
  ctx.strokeStyle = opt.line || 'rgba(232,237,248,.55)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke();
  label(ctx, text, x + dx + (dx >= 0 ? 4 : -4), y + dy, { align: dx >= 0 ? 'left' : 'right', size: opt.size || 14, color: opt.color });
  ctx.restore();
}

// 4本の光条つきの明るい星
export function sparkle(ctx, x, y, r, color, a = 1) {
  glow(ctx, x, y, r * 3, color, 0.5 * a);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = rgba(color, 0.8);
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(x - r * 2.4, y); ctx.lineTo(x + r * 2.4, y);
  ctx.moveTo(x, y - r * 2.4); ctx.lineTo(x, y + r * 2.4);
  ctx.stroke();
  ctx.restore();
  disc(ctx, x, y, r * 0.35, rgba('#ffffff', a));
}

// 尾根の線(山並み)。y は基準線、amp は振幅
export function ridge(ctx, seed, y, amp, fill, rough = 1) {
  const r = rng(seed);
  const k = [r() * 6, r() * 6, r() * 6, r() * 6];
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) {
    const h = Math.sin(x * 0.006 + k[0]) * 0.5 + Math.sin(x * 0.017 + k[1]) * 0.3 * rough + Math.sin(x * 0.041 + k[2]) * 0.15 * rough + Math.sin(x * 0.09 + k[3]) * 0.06 * rough;
    ctx.lineTo(x, y - amp * (0.5 + h * 0.5));
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

export function poly(ctx, pts, fill, stroke) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

// 背景のグラデーション
export function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
