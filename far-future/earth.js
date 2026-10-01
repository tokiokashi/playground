// 地上の景色・宇宙から見た地球・惑星のクローズアップ
import { W, H, TAU, clamp, lerp, smooth, rng, mix, rgba, ramp, rampNum, glow, disc, ball, stars, label, callout, sparkle, ridge, poly, vgrad } from './util.js';
import { plateRotations, plateRings, plateCenter, PLATE_KEYS, qRot, vec } from './plates.js';

const HZ = 330; // 地平線

// ---------- 地上 ----------
const SKY = {
  day: [[0, '#2f6fc4'], [1, '#a8d3f2']],
  dusk: [[0, '#151c45'], [0.55, '#6d4a7a'], [1, '#f08c58']],
  night: [[0, '#03060f'], [1, '#14203f']],
  hot: [[0, '#d98a4a'], [1, '#fbe6b8']],
  pale: [[0, '#8fa3b5'], [1, '#e2dccb']],
  glare: [[0, '#f2c58a'], [1, '#fff4dc']],
};

function skyBody(ctx, sc, env) {
  const sky = sc.sky || 'day';
  ctx.fillStyle = vgrad(ctx, 0, HZ, SKY[sky]);
  ctx.fillRect(0, 0, W, HZ + 2);
  if (sky === 'night' || sky === 'dusk') stars(ctx, sky === 'night' ? 1 : 0.35, 11, 220, [0, 0, W, HZ], env.t);
  if (sky === 'day') { glow(ctx, 640, 80, 90, '#fffbe8', 0.8); disc(ctx, 640, 80, 16, '#fffdf2'); }
  if (sky === 'dusk') { glow(ctx, 610, HZ - 6, 140, '#ffb070', 0.7); disc(ctx, 610, HZ - 6, 22, '#ffd59a'); }
  if (sky === 'pale') { glow(ctx, 600, 90, 140, '#fffaf0', 0.9); disc(ctx, 600, 90, 20, '#ffffff'); }
  if (sky === 'hot' || sky === 'glare') { glow(ctx, 560, 120, 260, '#fff2c8', 0.9); disc(ctx, 560, 120, sky === 'glare' ? 44 : 30, '#fffaf0'); }
}

function skyFx(ctx, sc, env) {
  const t = env.t;
  if (sc.dipper != null) dipper(ctx, sc.dipper);
  if (sc.grb) {
    const [x, y] = [W * 0.2, 70];
    const g = ctx.createLinearGradient(x, y, W, HZ);
    g.addColorStop(0, 'rgba(210,190,255,.9)'); g.addColorStop(1, 'rgba(210,190,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 10 + 3 * Math.sin(t * 6);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(W, HZ + 40); ctx.stroke();
    ctx.strokeStyle = g; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(0, -40); ctx.stroke();
  }
  if (sc.sn) {
    const s = sc.sn, x = s.x * W, y = s.y * HZ, r = (s.big ? 16 : 11) * (1 + 0.06 * Math.sin(t * 3));
    if (sc.sky === 'day') glow(ctx, x, y, r * 9, s.c || '#ffffff', 0.35);
    sparkle(ctx, x, y, r, s.c || '#ffffff');
    if (s.label) callout(ctx, s.label, x, y, 40, 34);
  }
  if (sc.star) {
    const s = sc.star, x = s.x * W, y = s.y * HZ;
    sparkle(ctx, x, y, 6, s.c || '#ffffff');
    if (s.label) callout(ctx, s.label, x, y, 36, 30);
  }
  if (sc.comets) {
    const r = rng(5);
    for (let i = 0; i < sc.comets; i++) {
      const x = 80 + r() * 600, y = 40 + r() * 180, len = 60 + r() * 90, a = -0.5 - r() * 0.4;
      const g = ctx.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.addColorStop(0, 'rgba(220,240,255,.85)'); g.addColorStop(1, 'rgba(220,240,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
      disc(ctx, x, y, 2.5, '#f4fbff');
    }
  }
  if (sc.asteroid) {
    const p = (env.t * 0.08) % 1, x = lerp(140, 470, p), y = lerp(40, 190, p);
    const g = ctx.createLinearGradient(x, y, x - 160, y - 80);
    g.addColorStop(0, 'rgba(255,200,120,.9)'); g.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 160, y - 80); ctx.stroke(); ctx.lineCap = 'butt';
    ball(ctx, x, y, 9, '#9a8a7a', '#3a322c');
    glow(ctx, x, y, 26, '#ffcf90', 0.6);
  }
}

// 北斗七星。f=0 で現在、f=1 で10万年後のおおよその形(ドゥーベとアルカイドが群れから離れていく)
function dipper(ctx, f) {
  const now = [[0, 0.35], [0.55, 0.05], [1.0, 0], [1.42, 0.1], [1.47, 0.58], [2.15, 0.62], [2.08, 0.06]];
  const d = [[-0.42, 0.42], [0.05, -0.04], [0.05, -0.04], [0.05, -0.04], [0.05, -0.04], [0.05, -0.04], [0.42, 0.52]];
  const S = 120, ox = 210, oy = 90;
  const draw = (pts, a, col) => {
    ctx.strokeStyle = rgba(col, a * 0.6); ctx.lineWidth = 1.2; ctx.setLineDash(a < 0.5 ? [4, 4] : []);
    ctx.beginPath();
    [0, 1, 2, 3, 4, 5, 6, 3].forEach((i, k) => { const [x, y] = pts[i]; k ? ctx.lineTo(ox + x * S, oy + y * S) : ctx.moveTo(ox + x * S, oy + y * S); });
    ctx.stroke(); ctx.setLineDash([]);
    for (const [x, y] of pts) disc(ctx, ox + x * S, oy + y * S, 3, rgba('#ffffff', a));
  };
  draw(now, 0.35, '#9fb4ff');
  const fut = now.map(([x, y], i) => [x + d[i][0] * f, y + d[i][1] * f]);
  draw(fut, 1, '#ffe7a0');
  label(ctx, '点線: 今の北斗七星', ox, oy + 125, { size: 13, color: '#9fb4ff' });
}

function seaBand(ctx, sky) {
  const c = sky === 'night' ? ['#0b1834', '#050b1a'] : sky === 'dusk' ? ['#4d3c66', '#1a1838'] : ['#2d6aa6', '#163d6b'];
  ctx.fillStyle = vgrad(ctx, HZ, H, [[0, c[0]], [1, c[1]]]);
  ctx.fillRect(0, HZ, W, H - HZ);
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  for (let y = HZ + 8; y < H; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

function volcano(ctx, x, base, w, h, col, t, erupt, big) {
  poly(ctx, [[x - w / 2, base], [x - 24, base - h], [x + 24, base - h], [x + w / 2, base]], col);
  if (!erupt) return;
  glow(ctx, x, base - h, 60, '#ff7a2a', 0.8);
  const r = rng(9), n = big ? 22 : 12;
  for (let i = 0; i < n; i++) {
    const k = (i / n + t * 0.05) % 1;
    const yy = base - h - k * (big ? 300 : 210), xx = x + (r() - 0.3) * 40 * k * 3 + k * 80;
    disc(ctx, xx, yy, 18 + k * (big ? 70 : 40), rgba(i % 3 ? '#6d6a6a' : '#8c8580', 0.55 * (1 - k * 0.6)));
  }
}

function tree(ctx, x, y, s, col) {
  ctx.fillStyle = '#4a3523'; ctx.fillRect(x - s * 0.08, y - s * 0.4, s * 0.16, s * 0.4);
  poly(ctx, [[x - s * 0.4, y - s * 0.3], [x, y - s * 1.3], [x + s * 0.4, y - s * 0.3]], col);
}

export function ground(ctx, sc, env) {
  const t = env.t, sky = sc.sky || 'day', e = sc.erosion ?? 0;
  skyBody(ctx, sc, env);
  const night = sky === 'night' ? 0.55 : sky === 'dusk' ? 0.3 : 0;
  const shade = c => mix(c, '#05070f', night);
  const land = sc.land || 'hills';
  const snow = sc.snow ?? 0;

  ridge(ctx, 3, HZ + 4, land === 'mountain' ? lerp(200, 40, e) : 70, shade(mix('#6e7f95', '#e8f0f8', snow)), land === 'mountain' ? lerp(1.8, 0.25, e) : 1);
  if (land === 'mountain' && e > 0.5) {
    ctx.save(); ctx.globalAlpha = 0.5; ctx.setLineDash([4, 5]); ctx.strokeStyle = '#ffffff';
    const r = rng(3), k = [r() * 6, r() * 6, r() * 6, r() * 6];
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) { const h = Math.sin(x * 0.006 + k[0]) * 0.5 + Math.sin(x * 0.017 + k[1]) * 0.3 * 1.8 + Math.sin(x * 0.041 + k[2]) * 0.15 * 1.8 + Math.sin(x * 0.09 + k[3]) * 0.06 * 1.8; x ? ctx.lineTo(x, HZ + 4 - 200 * (0.5 + h * 0.5)) : ctx.moveTo(x, HZ + 4 - 200 * (0.5 + h * 0.5)); }
    ctx.stroke(); ctx.restore();
    label(ctx, '点線: いまの山並み', 20, 30, { size: 13 });
  }
  skyFx(ctx, sc, env);

  if (land === 'sea' || land === 'ice') seaBand(ctx, sky);
  if (land === 'ice') {
    poly(ctx, [[0, 230], [260, 238], [300, 262], [320, 300], [330, HZ + 30], [0, HZ + 40]], shade('#e9f4fb'));
    poly(ctx, [[300, 262], [320, 300], [330, HZ + 30], [300, HZ + 32]], shade('#a9cde4'));
    const r = rng(4);
    for (let i = 0; i < 6; i++) {
      const x = 380 + i * 70 + r() * 30, s = 30 - i * 3 + r() * 10, y = HZ + 20 + r() * 60;
      poly(ctx, [[x - s, y], [x - s * 0.6, y - s * 0.7], [x + s * 0.5, y - s * 0.8], [x + s, y]], shade('#dcecf6'));
    }
    callout(ctx, '東南極の氷床', 120, 250, 30, -60);
  }
  if (land === 'sea' && sc.volcano === 'island') {
    const rise = 1;
    volcano(ctx, 420, HZ + 14, 280, 70 * rise, shade('#3b302c'), t, false);
    for (let i = 0; i < 8; i++) { const k = (i / 8 + t * 0.06) % 1; disc(ctx, 420 + k * 50, HZ - 56 - k * 160, 14 + k * 40, `rgba(240,244,248,${0.5 * (1 - k)})`); }
    callout(ctx, '新しい島(いまのロイヒ海山)', 420, HZ - 60, 90, -90);
  }
  if (land === 'sea' && sc.volcano === 'chain') {
    const xs = [[180, 1, 'ハワイ島'], [320, 0.5], [430, 0.35], [520, 0.25], [600, 0.15]];
    xs.forEach(([x, s, n], i) => {
      if (i === 0) { volcano(ctx, x, HZ + 16, 260 * s, 80 * s, shade('#3e5a36'), t, false); callout(ctx, n, x, HZ - 50, -40, -60); }
      else { ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(200,230,255,.5)'; ctx.beginPath(); ctx.ellipse(x, HZ + 30, 120 * s, 18 * s + 6, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    });
    label(ctx, '点線: 海に沈んだ島々', 520, HZ + 90, { size: 13, align: 'center' });
  }

  if (land !== 'sea' && land !== 'ice') {
    const base = {
      hills: '#5f8c4a', snow: '#e6eef6', desert: '#d6a96a', badlands: '#c69a6c', crater: '#c9a171', canyon: '#b8743f',
      mountain: '#6c7b58', pyramid: '#d8b07a', rushmore: '#7b8a63', plants: '#5f8c4a', dead: '#a99064', hot: '#b98552',
    }[land] || '#5f8c4a';
    const gcol = mix(base, '#f2f6fa', land === 'snow' ? 0 : snow * 0.9);
    ridge(ctx, 8, HZ + 40, 40, shade(mix(gcol, '#202020', 0.15)), 0.6);
    ctx.fillStyle = shade(gcol); ctx.fillRect(0, HZ + 30, W, H - HZ);

    if (land === 'badlands') {
      const r = rng(21);
      for (let i = 0; i < 7; i++) {
        const x = 40 + i * 115 + r() * 30, w = 70 + r() * 50, h = (90 + r() * 70) * (1 - e * 0.85);
        for (let k = 0; k < 6; k++) {
          const y0 = HZ + 35 - h * (k / 6), y1 = HZ + 35 - h * ((k + 1) / 6), ins = (k + 1) * w * 0.05;
          poly(ctx, [[x - w / 2 + k * w * 0.05, y0], [x - w / 2 + ins, y1], [x + w / 2 - ins, y1], [x + w / 2 - k * w * 0.05, y0]], shade(k % 2 ? '#d9b08a' : '#b97a58'));
        }
      }
    }
    if (land === 'crater') {
      const a = 1 - e * 0.85;
      ctx.fillStyle = shade(rgba('#7d5c3c', a)); ctx.beginPath(); ctx.ellipse(400, HZ + 60, 260, 46, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = shade(rgba('#9a7350', a)); ctx.beginPath(); ctx.ellipse(400, HZ + 66, 220, 34, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = shade(rgba('#e0c08f', a)); ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(400, HZ + 58, 262, 46, 0, Math.PI, TAU); ctx.stroke();
    }
    if (land === 'canyon') {
      const d = sc.depth ?? 1;
      for (let k = 0; k < 8; k++) {
        const y = HZ + 30 + k * 18 * d, w0 = 300 - k * 30, w1 = 300 - (k + 1) * 30;
        poly(ctx, [[400 - w0, y], [400 - w1, y + 18 * d], [400 + w1, y + 18 * d], [400 + w0, y]], shade(k % 2 ? '#c46a3a' : '#8e4a2c'));
      }
      ctx.strokeStyle = '#4c8fd0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(400 - 60, HZ + 30 + 160 * d); ctx.lineTo(400 + 60, HZ + 30 + 160 * d); ctx.stroke();
      callout(ctx, 'コロラド川', 440, HZ + 30 + 160 * d, 60, -20);
    }
    if (land === 'pyramid') {
      const a = 1 - e;
      const apex = lerp(HZ - 130, HZ - 30, e), half = lerp(130, 170, e);
      ctx.fillStyle = shade('#cfa268');
      ctx.beginPath(); ctx.moveTo(400 - half, HZ + 36);
      ctx.quadraticCurveTo(400 - half * 0.5 * a, lerp(apex, HZ - 50, e), 400, apex);
      ctx.quadraticCurveTo(400 + half * 0.5 * a, lerp(apex, HZ - 50, e), 400 + half, HZ + 36);
      ctx.fill();
      poly(ctx, [[400, apex], [400 + half, HZ + 36], [400 + half * 0.2, HZ + 36]], shade(rgba('#9c7240', 0.5 * a + 0.1)));
      if (sc.ghost) { ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,.6)'; poly(ctx, [[270, HZ + 36], [400, HZ - 130], [530, HZ + 36]], null, 'rgba(255,255,255,.6)'); ctx.setLineDash([]); label(ctx, '点線: いまのピラミッド', 560, HZ - 90, { size: 13 }); }
    }
    if (land === 'rushmore') {
      ridge(ctx, 14, HZ + 30, 170, shade('#9a9690'), 0.8);
      const a = 1 - e;
      for (let i = 0; i < 4; i++) {
        const x = 300 + i * 70, y = HZ - 60 - (i % 2) * 10;
        ctx.fillStyle = shade(rgba('#b8b3aa', a)); ctx.beginPath(); ctx.ellipse(x, y, 24, 36, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = shade(rgba('#6f6b65', a)); ctx.fillRect(x - 12, y - 8, 8, 4); ctx.fillRect(x + 4, y - 8, 8, 4); ctx.fillRect(x - 2, y + 2, 4, 12); ctx.fillRect(x - 10, y + 20, 20, 3);
      }
    }
    if (land === 'hills' || land === 'plants' || land === 'snow') {
      const r = rng(31), dead = sc.dead ?? 0;
      const n = land === 'plants' ? 26 : 12;
      for (let i = 0; i < n; i++) {
        const x = r() * W, y = HZ + 50 + r() * 120, s = 26 + r() * 30;
        if (r() < dead * 0.6) continue;
        tree(ctx, x, y, s, shade(mix(snow > 0.5 ? '#2f4b3a' : '#2f6b33', '#7a5f3a', dead)));
      }
    }
    if (land === 'desert' || land === 'hot' || land === 'dead') {
      for (let i = 0; i < 4; i++) ridge(ctx, 40 + i, HZ + 60 + i * 34, 28, shade(mix(base, '#7a5030', i * 0.12)), 0.4);
    }
  }
  if (sc.volcano === 'erupt') volcano(ctx, 590, HZ + 30, 300, 120, shade('#4b4440'), t, true, sc.big);
  if (sc.haze) { ctx.fillStyle = rgba('#c9c0a0', 0.25 * sc.haze); ctx.fillRect(0, 0, W, H); }
}

// ---------- 宇宙から見た地球 ----------
const D = Math.PI / 180;
function viewer(lat0, lon0, cx, cy, R) {
  const cl = Math.cos(lat0 * D), sl = Math.sin(lat0 * D), co = Math.cos(-lon0 * D), so = Math.sin(-lon0 * D);
  return v => {
    const x1 = v[0] * co - v[1] * so, y1 = v[0] * so + v[1] * co, z1 = v[2];
    const x2 = x1 * cl + z1 * sl, z2 = -x1 * sl + z1 * cl;
    return [cx + R * y1, cy - R * z2, x2];
  };
}
function pathSphere(ctx, pts, proj, cx, cy, R) {
  let any = false;
  ctx.beginPath();
  pts.forEach((v, i) => {
    let [x, y, d] = proj(v);
    if (d > 0) any = true;
    else { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; x = cx + dx / l * R; y = cy + dy / l * R; }
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.closePath();
  return any;
}

let clouds = null;
export function earthState(L) {
  return {
    ocean: ramp([[8.9, '#1f5fa6'], [9.05, '#2f7f8f'], [9.2, '#cfc2a2'], [9.45, '#b08a62'], [9.55, '#5b2412']], L),
    land: ramp([[8.75, '#4f7d3e'], [8.88, '#8b7a4a'], [9.0, '#b98e57'], [9.45, '#9a5c34'], [9.55, '#2c0e06']], L),
    ice: 1 - smooth(8.95, 9.08, L),
    cloud: L < 9 ? 0.75 : L < 9.25 ? 0.95 : rampNum([[9.25, 0.95], [9.4, 0.1]], L),
    venus: smooth(9.45, 9.6, L),
    rim: ramp([[9.0, '#7fb6ff'], [9.25, '#d8e4ff'], [9.5, '#ffb070']], L),
  };
}

export function globe(ctx, sc, env) {
  const t = env.t, L = env.L;
  const cx = sc.cx ?? 400, cy = sc.cy ?? 250, R = sc.r ?? 185;
  ctx.fillStyle = '#02040a'; ctx.fillRect(0, 0, W, H);
  stars(ctx, 0.9, 3, 200, [0, 0, W, H], t);
  const st = earthState(L);
  const lat0 = sc.lat ?? 18, lon0 = (sc.lon ?? 10) + (sc.spin === false ? 0 : t * 2.5);
  const proj = viewer(lat0, lon0, cx, cy, R);

  glow(ctx, cx, cy, R * 1.18, st.rim, 0.35);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
  ctx.fillStyle = st.ocean; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  const Q = plateRotations(env.years);
  ctx.fillStyle = st.land; ctx.strokeStyle = st.land; ctx.lineWidth = 0.8;
  for (const k of PLATE_KEYS) {
    for (const ring of plateRings(k)) {
      const pts = ring.map(v => qRot(Q[k], v));
      if (pathSphere(ctx, pts, proj, cx, cy, R)) { ctx.fill(); ctx.stroke(); }
    }
  }
  // 極冠
  const capA = st.ice * (1 + (sc.ice ?? 0));
  if (capA > 0.01) {
    for (const s of [1, -1]) {
      const lat = s * lerp(78, 58, clamp(sc.ice ?? 0));
      const ring = Array.from({ length: 72 }, (_, i) => vec(lat, i * 5));
      ctx.fillStyle = rgba('#f4f8ff', Math.min(1, capA) * 0.92);
      if (pathSphere(ctx, ring, proj, cx, cy, R)) ctx.fill();
    }
  }
  // 雲
  // 雲は緯度に沿った細長い筋にする(大陸の形を隠しすぎないように)
  if (!clouds) { const r = rng(17); clouds = Array.from({ length: 46 }, () => { const lat = (r() < 0.5 ? -1 : 1) * (10 + r() * 55); return [lat, r() * 360, 8 + r() * 22]; }); }
  const cloudCol = mix('#ffffff', '#e9c47a', st.venus);
  const cA = (sc.clouds ?? 1) * (st.cloud * 0.6 + st.venus * 0.9);
  if (cA > 0.01) for (const [lat, lon, len] of clouds) {
    ctx.strokeStyle = rgba(cloudCol, Math.min(0.8, cA));
    ctx.lineWidth = 3 + st.venus * 8; ctx.lineCap = 'round';
    ctx.beginPath();
    let on = false;
    for (let k = 0; k <= 6; k++) {
      const [x, y, d] = proj(vec(lat + Math.sin(k + lon) * 2, lon + k * len / 6 + t * 1.2));
      if (d <= 0.08) { on = false; continue; }
      on ? ctx.lineTo(x, y) : ctx.moveTo(x, y); on = true;
    }
    ctx.stroke(); ctx.lineCap = 'butt';
  }
  if (st.venus > 0) {
    // 溶けた地表の割れ目
    const r = rng(23);
    ctx.strokeStyle = rgba('#ff8a2a', 0.7 * st.venus); ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      const v = vec(r() * 160 - 80, r() * 360), [x, y, d] = proj(v);
      if (d <= 0) continue;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 40 * d, y + (r() - 0.5) * 30); ctx.stroke();
    }
  }
  // 夜の側
  const sh = ctx.createLinearGradient(cx - R * 0.1, 0, cx + R, 0);
  sh.addColorStop(0, 'rgba(0,0,8,0)'); sh.addColorStop(1, `rgba(0,0,8,${sc.night ?? 0.78})`);
  ctx.fillStyle = sh; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();
  ctx.strokeStyle = rgba(st.rim, 0.55); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, TAU); ctx.stroke();

  if (sc.haze) { glow(ctx, cx, cy, R * 1.35, '#b8c27a', 0.35 * sc.haze); }
  if (sc.mag != null) {
    ctx.strokeStyle = rgba('#7fd8ff', 0.5 * sc.mag); ctx.lineWidth = 1.2; ctx.setLineDash([6, 6]);
    for (let k = 1; k <= 3; k++) {
      ctx.beginPath(); ctx.ellipse(cx - R * (0.6 + k * 0.35), cy, R * (0.6 + k * 0.35), R * (0.35 + k * 0.28), 0, -Math.PI / 2, Math.PI / 2, true); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx + R * (0.6 + k * 0.45), cy, R * (0.6 + k * 0.45), R * (0.35 + k * 0.22), 0, Math.PI / 2, -Math.PI / 2, true); ctx.stroke();
    }
    ctx.setLineDash([]);
    label(ctx, sc.mag > 0.5 ? '地磁気(磁気圏)' : '弱まる地磁気', cx + R + 30, cy - R * 0.9, { size: 13, color: '#9fe3ff' });
  }
  if (sc.asteroid) {
    const p = 0.5 + 0.5 * Math.sin(t * 0.6), x = lerp(90, 160, p), y = lerp(80, 110, p);
    const g = ctx.createLinearGradient(x, y, x - 120, y - 60);
    g.addColorStop(0, 'rgba(255,190,120,.85)'); g.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 120, y - 60); ctx.stroke(); ctx.lineCap = 'butt';
    ball(ctx, x, y, 11, '#a39383', '#3a322c');
    ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(255,220,180,.5)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx - R * 0.5, cy - R * 0.4); ctx.stroke(); ctx.setLineDash([]);
    callout(ctx, sc.asteroid === true ? '小惑星' : sc.asteroid, x, y, 30, 40);
  }
  if (sc.grb) {
    const g = ctx.createLinearGradient(W, 0, cx, cy);
    g.addColorStop(0, 'rgba(220,200,255,.9)'); g.addColorStop(1, 'rgba(220,200,255,.05)');
    ctx.strokeStyle = g; ctx.lineWidth = 24 + 6 * Math.sin(t * 5); ctx.beginPath(); ctx.moveTo(W + 20, -20); ctx.lineTo(cx + R * 0.2, cy - R * 0.2); ctx.stroke();
    callout(ctx, 'ガンマ線バースト', 700, 60, -40, 40);
  }
  if (sc.sat) {
    const a = t * 0.5, x = cx + Math.cos(a) * (R + 50), y = cy + Math.sin(a) * (R + 20) * 0.5;
    ctx.fillStyle = '#d9d9e0'; ctx.fillRect(x - 5, y - 5, 10, 10);
    ctx.fillStyle = '#5a7fd0'; ctx.fillRect(x - 18, y - 2, 11, 4); ctx.fillRect(x + 7, y - 2, 11, 4);
    callout(ctx, sc.sat, x, y, 40, -40);
    const g = ctx.createLinearGradient(cx - R - 40, cy - 70, cx - R * 0.7, cy - R * 0.5);
    g.addColorStop(0, 'rgba(255,170,90,0)'); g.addColorStop(1, 'rgba(255,200,120,.9)');
    ctx.strokeStyle = g; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - R - 80, cy - 110); ctx.lineTo(cx - R * 0.93, cy - R * 0.38); ctx.stroke();
    label(ctx, '大気圏へ再突入', cx - R - 70, cy - 130, { size: 13, color: '#ffcf9a' });
  }
  if (sc.names) {
    const NAMES = { NA: '北アメリカ', SA: '南アメリカ', AF: 'アフリカ', EU: 'ユーラシア', AU: 'オーストラリア', AN: '南極' };
    for (const [k, n] of Object.entries(NAMES)) {
      const [x, y, d] = proj(qRot(Q[k], plateCenter(k)));
      if (d > 0.25) label(ctx, n, x, y, { size: 13, align: 'center', color: '#fff8e0' });
    }
  }
  if (sc.mark) {
    const [lat, lon, text, plate] = sc.mark;
    const v = plate ? qRot(Q[plate], vec(lat, lon)) : vec(lat, lon);
    const [x, y, d] = proj(v);
    if (d > 0) {
      ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.stroke();
      callout(ctx, text, x + 9, y - 9, 70, -60, { color: '#ffe9a8' });
    }
  }
  if (sc.moon) {
    const dist = R + 60 + (L - 7) * 18;
    ball(ctx, cx + dist, cy - 90, 22, '#d8d6d0', '#55524c');
  }
}

// ---------- 惑星 ----------
export function planet(ctx, sc, env) {
  const t = env.t, cx = 400, cy = 255;
  ctx.fillStyle = '#02040a'; ctx.fillRect(0, 0, W, H);
  stars(ctx, 0.9, 41, 220, [0, 0, W, H], t);
  const body = sc.body;
  if (body === 'mars') {
    const R = 150, tf = sc.terraform ?? 0, warm = sc.warm ?? 0;
    glow(ctx, cx, cy, R * 1.15, mix('#e8a080', '#8fc4ff', Math.max(tf, warm * 0.6)), 0.25 + warm * 0.2 + tf * 0.3);
    ball(ctx, cx, cy, R, mix('#d9774a', '#c79a62', tf * 0.5), '#3a140a');
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    const r = rng(77);
    for (let i = 0; i < 14; i++) { ctx.fillStyle = rgba('#7a3a20', 0.35); ctx.beginPath(); ctx.ellipse(cx - R + r() * R * 2, cy - R * 0.6 + r() * R * 1.2, 20 + r() * 40, 8 + r() * 14, r(), 0, TAU); ctx.fill(); }
    if (tf > 0) {
      ctx.fillStyle = rgba('#2b6fb0', tf * 0.9); ctx.beginPath(); ctx.ellipse(cx - 20, cy - 60, 150, 50, -0.2, 0, TAU); ctx.fill();
      for (let i = 0; i < 10; i++) { ctx.fillStyle = rgba('#4f8f45', tf * 0.7); ctx.beginPath(); ctx.ellipse(cx - R + r() * R * 2, cy + r() * R * 0.7, 18 + r() * 30, 8 + r() * 12, r(), 0, TAU); ctx.fill(); }
      for (let i = 0; i < 12; i++) { ctx.fillStyle = rgba('#ffffff', tf * 0.45); ctx.beginPath(); ctx.ellipse(cx - R + r() * R * 2, cy - R + r() * R * 2, 30 + r() * 30, 7, 0.2, 0, TAU); ctx.fill(); }
    }
    const cap = sc.cap ?? 0.3;
    ctx.fillStyle = 'rgba(250,250,255,.92)'; ctx.beginPath(); ctx.ellipse(cx, cy - R * 0.97, R * cap * 1.6, R * cap * 0.6, 0, 0, TAU); ctx.fill();
    const sh = ctx.createLinearGradient(cx - R * 0.2, 0, cx + R, 0); sh.addColorStop(0, 'rgba(0,0,8,0)'); sh.addColorStop(1, 'rgba(0,0,8,.75)');
    ctx.fillStyle = sh; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
    if (sc.capNote) callout(ctx, sc.capNote, cx + 20, cy - R * 0.98, 110, -40);
    if (sc.phobos) {
      const p = sc.phobos; // 1 = 落ちる直前、2 = 砕けて環に
      if (p >= 2) {
        ctx.strokeStyle = 'rgba(200,180,160,.5)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.45, R * 0.28, -0.15, 0, TAU); ctx.stroke();
        callout(ctx, 'フォボスのかけらの環(説の一つ)', cx + R * 1.3, cy + 40, 20, 60);
      } else {
        const a = t * 0.9, x = cx + Math.cos(a) * R * 1.35, y = cy + Math.sin(a) * R * 0.3;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#8a7a6a'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 9, 0, 0, TAU); ctx.fill(); ctx.restore();
        ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.35, R * 0.3, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        label(ctx, 'フォボス(少しずつ火星へ近づく)', 560, 420, { size: 14 });
      }
    }
    label(ctx, '火星', 60, 50, { size: 18 });
  } else if (body === 'uranus' || body === 'neptune') {
    const R = 130, nep = body === 'neptune';
    ball(ctx, cx - 60, cy, R, nep ? '#5b86e8' : '#bfeef0', nep ? '#0b1a55' : '#2c5d66');
    ctx.strokeStyle = 'rgba(200,230,240,.35)'; ctx.lineWidth = 2;
    if (!nep) { ctx.beginPath(); ctx.ellipse(cx - 60, cy, R * 0.35, R * 1.6, 0.1, 0, TAU); ctx.stroke(); }
    if (nep && sc.ring) {
      const a = sc.ring;
      for (let k = 0; k < 5; k++) { ctx.strokeStyle = rgba('#d8d0c0', 0.25 * a); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx - 60, cy, R * (1.5 + k * 0.12), R * (0.32 + k * 0.025), -0.2, 0, TAU); ctx.stroke(); }
      callout(ctx, 'トリトンが砕けてできる環', cx + 120, cy + 40, 50, 60);
    } else if (nep) {
      ball(ctx, cx + 170, cy - 70, 20, '#e6dccd', '#5e5348');
      callout(ctx, 'トリトン(海王星へ落ちていく)', cx + 170, cy - 70, 30, -50);
    }
    if (sc.collide) {
      const [n1, n2] = sc.collide;
      const p = (t * 0.25) % 1, x = cx + 170, y = cy + 20;
      const off = p < 0.6 ? (1 - p / 0.6) * 90 : 0;
      if (p < 0.6) {
        ball(ctx, x - off, y - off * 0.3, 9, '#ccc', '#444'); ball(ctx, x + off, y + off * 0.3, 7, '#ccc', '#444');
      } else {
        const k = (p - 0.6) / 0.4;
        glow(ctx, x, y, 30 + k * 50, '#fff2d0', 1 - k);
        const r = rng(3); for (let i = 0; i < 18; i++) { const a = r() * TAU, d = k * 80 * (0.4 + r()); disc(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 1.6, rgba('#d8d0c8', 1 - k * 0.6)); }
      }
      callout(ctx, `${n1} と ${n2}`, x, y, 40, 70);
    }
    label(ctx, nep ? '海王星' : '天王星', 60, 50, { size: 18 });
  } else if (body === 'saturn') {
    const R = 110, ra = sc.ringA ?? 1;
    const ringPath = (k, half) => { ctx.beginPath(); ctx.ellipse(cx, cy, R * k, R * k * 0.28, -0.3, half ? Math.PI : 0, half ? TAU : Math.PI); };
    const rings = (half) => { for (let k = 1.3; k < 2.3; k += 0.06) { ctx.strokeStyle = rgba(k > 1.9 && k < 1.96 ? '#000000' : '#e6d6b0', 0.5 * ra); ctx.lineWidth = 4; ringPath(k, half); ctx.stroke(); } };
    rings(true);
    ball(ctx, cx, cy, R, '#f0d9a0', '#5a4220');
    rings(false);
    if (ra < 0.6) { ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ringPath(2.25, false); ctx.stroke(); ringPath(2.25, true); ctx.stroke(); ctx.setLineDash([]); label(ctx, '点線: いまの環の外縁', 560, 420, { size: 13 }); }
    label(ctx, '土星', 60, 50, { size: 18 });
  }
}
