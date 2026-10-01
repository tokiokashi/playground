// 太陽・銀河・宇宙の終わりの方の景色と、天体の配置図
import { W, H, TAU, clamp, lerp, smooth, rng, mix, rgba, ramp, rampNum, glow, disc, ball, stars, label, callout, sparkle, poly, vgrad } from './util.js';

const black = (ctx, c = '#02040a') => { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); };

// ---------- 太陽の最期 ----------
// 半径(太陽半径の何倍か)の時間変化。赤色巨星の先端で約256倍、その後の白色矮星は約0.012倍
const SUN_R = [[4.6e9, 1], [5e9, 1.6], [6e9, 2.3], [7e9, 5], [7.4e9, 30], [7.5e9, 100], [7.59e9, 256], [7.65e9, 12], [7.8e9, 30], [7.9e9, 230], [7.98e9, 150], [8e9, 0.012]];
export function sunRadius(y) { return rampNum(SUN_R, y); }

export function solar(ctx, sc, env) {
  const t = env.t, y = env.years;
  black(ctx);
  stars(ctx, 0.8, 5, 180, [0, 0, W, H], t);
  const sx = 60, sy = 260, AU = 440, Rs = sunRadius(y);
  const wd = y >= 7.99e9;
  const rpx = wd ? 6 : Math.max(16, Rs * 1.86);
  const col = ramp([[1, '#fff3c4'], [3, '#ffd27a'], [20, '#ff9a4a'], [120, '#e8582a'], [256, '#c8361c']], Rs);
  // 惑星の軌道
  const planets = [[0.39, '水星', '#b0a69a', 4, 7.45], [0.72, '金星', '#e8d2a0', 6, 7.55], [1, '地球', '#5b8fd8', 6.5, 7.59], [1.52, '火星', '#d9774a', 5, 99]];
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
  for (const [a] of planets) { ctx.beginPath(); ctx.arc(sx, sy, a * AU, -0.6, 0.6); ctx.stroke(); }
  if (wd) {
    // 惑星状星雲
    const k = sc.nebula ?? 1;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = rgba(['#66e0d0', '#d070e0', '#7ab0ff'][i], 0.35 * k); ctx.lineWidth = 18 - i * 4;
      ctx.beginPath(); ctx.ellipse(sx + 40, sy, 160 + i * 60 + Math.sin(t + i) * 4, 120 + i * 50, 0.2, 0, TAU); ctx.stroke();
    }
    glow(ctx, sx + 40, sy, 60, '#cfe4ff', 0.9); disc(ctx, sx + 40, sy, 5, '#ffffff');
    callout(ctx, '白色矮星(地球くらいの大きさ)', sx + 44, sy, 70, -150);
  } else {
    glow(ctx, sx, sy, rpx * 1.6 + 30, col, 0.6);
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rpx);
    g.addColorStop(0, mix(col, '#ffffff', 0.35)); g.addColorStop(0.8, col); g.addColorStop(1, mix(col, '#400a00', 0.4));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, rpx, 0, TAU); ctx.fill();
    if (rpx > 60) {
      const r = rng(8);
      ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, rpx, 0, TAU); ctx.clip();
      for (let i = 0; i < 60; i++) { const a = r() * TAU, d = r() * rpx; disc(ctx, sx + Math.cos(a) * d, sy + Math.sin(a) * d, 8 + r() * rpx * 0.12, rgba('#ffd0a0', 0.08 + 0.06 * Math.sin(t + i))); }
      ctx.restore();
    }
  }
  for (const [a, n, c, r, gone] of planets) {
    const x = sx + a * AU;
    const inside = !wd && (x - sx) < rpx;
    const lost = y / 1e9 >= gone && !(sc.survivor && n === '地球');
    if (lost || inside) {
      if (inside && !lost) glow(ctx, x, sy, 18, '#ffeecc', 0.6);
      label(ctx, n, x, sy + 28, { size: 13, align: 'center', alpha: 0.7 });
      if (lost) label(ctx, 'のみ込まれた', x, sy + 46, { size: 11, align: 'center', alpha: 0.6 });
      continue;
    }
    const pc = n === '地球' && y > 1e9 ? (wd ? '#5a6070' : '#5a3a2a') : c;
    ball(ctx, x, sy, r, mix(pc, '#ffffff', 0.25), mix(pc, '#000000', 0.6));
    label(ctx, n, x, sy + 22, { size: 13, align: 'center' });
    if (n === '地球' && sc.moon) { ball(ctx, x + 16, sy - 10, 2.5, '#ddd', '#555'); }
  }
  if (sc.moonRing && !wd) {
    const x = sx + AU;
    ctx.strokeStyle = 'rgba(220,210,200,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, sy, 22, 6, -0.3, 0, TAU); ctx.stroke();
    callout(ctx, '砕けた月の環', x, sy - 6, 40, -70);
  }
  if (!wd) callout(ctx, `太陽(半径は今の約${Rs < 10 ? Rs.toFixed(1) : Math.round(Rs)}倍)`, sx + rpx * 0.5, sy - rpx * 0.75, 40, -30);
  label(ctx, '大きさは誇張・距離は縮尺どおり(1天文単位=地球の軌道)', W - 16, H - 18, { size: 12, align: 'right', alpha: 0.6 });
}

// ---------- 銀河 ----------
let galStars = null;
export function galaxy(ctx, sc, env) {
  const t = env.t, L = env.L;
  black(ctx, '#010207');
  // 宇宙マイクロ波背景放射(見えないものを色で表す)
  const cmb = sc.cmb ? 1 : 1 - smooth(10.6, 11.3, L);
  if (cmb > 0.01 && sc.cmb) {
    const r = rng(12);
    for (let i = 0; i < 120; i++) disc(ctx, r() * W, r() * H, 18 + r() * 26, rgba(r() > 0.5 ? '#ff7a3a' : '#3a6aff', 0.045 * cmb));
    label(ctx, sc.cmb === 'fade' ? '宇宙マイクロ波背景放射: 2.7 K → 0.3 K' : '宇宙マイクロ波背景放射(色は想像)', 20, 30, { size: 13, color: '#ffc49a' });
  }
  // 遠くの銀河
  const bg = 1 - smooth(10.5, 11.0, L);
  if (bg > 0.01) {
    const r = rng(19);
    for (let i = 0; i < 70; i++) {
      const x = r() * W, y = r() * H, s = 2 + r() * 6;
      ctx.fillStyle = rgba(mix('#d8d0ff', '#ff6a3a', 1 - bg), 0.6 * bg); ctx.beginPath(); ctx.ellipse(x, y, s, s * (0.3 + r() * 0.7), r() * 3, 0, TAU); ctx.fill();
    }
  } else stars(ctx, 0, 1, 1);
  const cx = 400, cy = 250;
  const bright = rampNum([[12, 1], [13, 0.75], [14, 0.4], [14.1, 0.25]], L);
  const warm = smooth(11.5, 14, L);
  if (!galStars) { const r = rng(2); galStars = Array.from({ length: 900 }, () => { const u = r(), v = r(); const g = Math.sqrt(-2 * Math.log(u + 1e-9)); return [g * Math.cos(TAU * v), g * Math.sin(TAU * v), r()]; }); }

  if (sc.mode === 'collide') {
    const spiral = (x, y, rx, ry, rot, col, seed) => {
      const r = rng(seed);
      glow(ctx, x, y, rx * 0.5, col, 0.8);
      for (let i = 0; i < 500; i++) {
        const arm = i % 2, k = r(), a = k * 7 + arm * Math.PI + (r() - 0.5) * 0.6, d = k * rx;
        const px = Math.cos(a) * d, py = Math.sin(a) * d * (ry / rx);
        disc(ctx, x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot), 0.9 + r() * 1.2, rgba(r() > 0.8 ? '#9fc4ff' : '#fff0d8', 0.7));
      }
    };
    spiral(300, 230, 210, 70, -0.25, '#ffe6b8', 4);
    spiral(520, 280, 190, 110, 0.6, '#ffe0c8', 5);
    for (let i = 0; i < 30; i++) glow(ctx, 380 + Math.sin(i * 7.1) * 140, 250 + Math.cos(i * 3.3) * 80, 12, '#ff6ab0', 0.5);
    callout(ctx, '天の川銀河', 160, 220, -20, -90);
    callout(ctx, 'アンドロメダ銀河', 640, 300, 30, 80);
    return;
  }
  // 合体後の楕円銀河(ミルコメダ)
  const rx = 230 * (sc.rip ? 1.6 : 1), ry = 150 * (sc.rip ? 0.7 : 1);
  const coreCol = mix('#fff1d6', '#ff7a40', warm);
  glow(ctx, cx, cy, ry * 1.7, coreCol, 0.75 * bright);
  for (const [gx, gy, m] of galStars) {
    const x = cx + gx * rx * 0.42, y = cy + gy * ry * 0.42;
    const c = m > 0.85 && L < 12.2 ? '#a8c8ff' : mix('#fff0d8', '#ff5a30', warm);
    disc(ctx, x, y, 0.7 + m, rgba(c, (0.35 + 0.5 * m) * bright));
  }
  if (sc.rip) {
    ctx.strokeStyle = 'rgba(0,0,0,.9)'; ctx.lineWidth = 7;
    const r = rng(6);
    for (let i = 0; i < 6; i++) { ctx.beginPath(); let x = cx - 300 + i * 110, y = 40; ctx.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 50; y += 55; ctx.lineTo(x, y); } ctx.stroke(); }
    label(ctx, 'もしビッグリップが起きるなら(起きないと見られている)', cx, H - 26, { size: 14, align: 'center', color: '#ffb4b4' });
  }
  // 局所銀河群の小さな銀河(4500億年後までに合体)
  const merge = smooth(10.9, 11.65, L);
  if (merge < 1 && !sc.rip) {
    const r = rng(28);
    for (let i = 0; i < 9; i++) {
      const a = r() * TAU, d0 = 260 + r() * 140, d = lerp(d0, 30, merge);
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.7;
      glow(ctx, x, y, 14 + r() * 10, mix('#fff0d8', '#ff7a40', warm), 0.6 * (1 - merge) * bright);
    }
  }
  if (sc.note) label(ctx, sc.note, cx, H - 26, { size: 14, align: 'center', color: '#ffe0b0' });
}

// ---------- ひとつの星 ----------
export function star(ctx, sc, env) {
  const t = env.t, cx = 400, cy = 250;
  black(ctx);
  stars(ctx, sc.dark ? 0.15 : 0.7, 61, 160, [0, 0, W, H], t);
  const k = sc.kind;
  if (k === 'reddwarf' || k === 'bluedwarf') {
    const c = k === 'reddwarf' ? '#ff6a3a' : '#9fc4ff';
    glow(ctx, cx, cy, 220, c, 0.6); ball(ctx, cx, cy, 110, mix(c, '#ffffff', 0.5), mix(c, '#000000', 0.3));
  } else if (k === 'whitedwarf') {
    if (sc.from) { ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(255,140,90,.55)'; ctx.beginPath(); ctx.arc(cx, cy, 120, 0, TAU); ctx.stroke(); ctx.setLineDash([]); label(ctx, sc.from, cx, cy + 140, { size: 13, align: 'center', color: '#ffb08a' }); }
    glow(ctx, cx, cy, 90, '#d8e6ff', 0.9); disc(ctx, cx, cy, 14, '#ffffff');
  } else if (k === 'blackdwarf') {
    ball(ctx, cx, cy, 70, '#2a2630', '#050407');
    ctx.strokeStyle = 'rgba(120,90,140,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 71, 0, TAU); ctx.stroke();
    if (sc.planet) {
      ctx.strokeStyle = 'rgba(160,190,255,.35)'; ctx.setLineDash([3, 5]); ctx.beginPath();
      for (let a = 0; a < 6 * TAU; a += 0.1) { const r = 260 - a * 5.5; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.5); }
      ctx.stroke(); ctx.setLineDash([]);
      const a = (t * 0.6) % TAU; ball(ctx, cx + Math.cos(a) * 240, cy + Math.sin(a) * 120, 9, '#5a6478', '#0a0c12');
      callout(ctx, '地球(凍りついたまま渦を巻いて落ちる)', cx + 240, cy - 10, 30, -90);
    }
    callout(ctx, sc.label || '黒色矮星になった太陽', cx - 50, cy + 50, -60, 80);
    return;
  } else if (k === 'liquid') {
    const f = sc.f ?? 1, r = rng(5);
    ctx.fillStyle = '#6a6e78'; ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU; const bump = 1 + (1 - f) * 0.18 * Math.sin(a * 5 + 1) * Math.sin(a * 3); ctx.lineTo(cx + Math.cos(a) * 110 * bump, cy + Math.sin(a) * 110 * bump); }
    ctx.fill();
    ball(ctx, cx, cy, 110 * f, 'rgba(180,186,200,.5)', 'rgba(20,22,30,.6)');
    label(ctx, '山も谷も、ゆっくり流れてならされる', cx, cy + 160, { size: 14, align: 'center' });
  }
  if (sc.label) callout(ctx, sc.label, cx + 60, cy - 60, 70, -60);
}

// ---------- 縮退の時代 ----------
let degenObjs = null;
export function degen(ctx, sc, env) {
  const t = env.t, L = env.L;
  black(ctx, '#010103');
  if (!degenObjs) {
    const r = rng(44);
    degenObjs = Array.from({ length: 70 }, (_, i) => ({ x: r() * W, y: r() * H, k: ['wd', 'wd', 'bd', 'bd', 'pl', 'ns', 'bh'][Math.floor(r() * 7)], ej: 18.9 + r() * 1.4, s: r(), keep: i % 25 === 0 }));
  }
  const decay = smooth(34, 42, L);
  const smbh = smooth(25, 30, L);
  for (const o of degenObjs) {
    let a = o.keep ? 1 : 1 - smooth(o.ej - 0.3, o.ej + 0.3, L);
    if (o.k !== 'bh') a *= 1 - decay;
    if (sc.eject) a = o.keep ? 1 : 0.9;
    if (a < 0.02) continue;
    let { x, y } = o;
    if (sc.eject) {
      const dx = x - 400, dy = y - 250, l = Math.hypot(dx, dy) || 1, m = (t * 30 * (0.5 + o.s)) % 260;
      ctx.strokeStyle = rgba('#b8a0ff', 0.25 * a); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + dx / l * Math.max(0, m - 60), y + dy / l * Math.max(0, m - 60)); ctx.lineTo(x + dx / l * m, y + dy / l * m); ctx.stroke();
      x += dx / l * m; y += dy / l * m;
    }
    else if (smbh > 0 && o.k !== 'bh') { x = lerp(x, 400, smbh * 0.6); y = lerp(y, 250, smbh * 0.6); }
    if (o.k === 'wd') { const c = ramp([[14, '#dfe8ff'], [15, '#ffc890'], [16, '#a04a30'], [17, '#6a3a40']], L); glow(ctx, x, y, 8, c, 0.8 * a); disc(ctx, x, y, 1.6, rgba(c, a)); }
    if (o.k === 'bd') { glow(ctx, x, y, 7, '#a0285a', 0.5 * a); disc(ctx, x, y, 2.2, rgba('#5a1830', a)); }
    if (o.k === 'pl') { disc(ctx, x, y, 2.5, rgba('#1a1c24', a)); ctx.strokeStyle = rgba('#5a6a90', 0.5 * a); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x, y, 2.6, -2.5, -0.5); ctx.stroke(); }
    if (o.k === 'ns') { glow(ctx, x, y, 6, '#9fc0ff', 0.6 * a * (1 - smooth(15, 18, L) * 0.7)); disc(ctx, x, y, 1.2, rgba('#cfe0ff', a)); }
    if (o.k === 'bh') { ctx.strokeStyle = rgba('#ffcf9a', 0.55 * a); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.stroke(); disc(ctx, x, y, 3.4, '#000'); }
  }
  // たまに起きる衝突の閃光
  if (L < 16 && !sc.eject) {
    const p = (t * 0.3) % 1, r = rng(Math.floor(t * 0.3) + 1);
    const x = 100 + r() * 600, y = 60 + r() * 380;
    glow(ctx, x, y, 40 * p + 5, '#fff4e0', (1 - p) * 0.9);
  }
  if (smbh > 0.01) {
    const R = 30 + 40 * smbh;
    ctx.save(); ctx.translate(400, 250); ctx.scale(1, 0.35);
    for (let i = 0; i < 6; i++) { ctx.strokeStyle = rgba(['#ffb060', '#ff7a30', '#ffd8a0'][i % 3], 0.35 * smbh * (1 - decay * 0.6)); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, R * (1.5 + i * 0.3), 0, TAU); ctx.stroke(); }
    ctx.restore();
    disc(ctx, 400, 250, R, '#000');
    ctx.strokeStyle = rgba('#ffe0b0', 0.8 * smbh); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(400, 250, R + 2, 0, TAU); ctx.stroke();
    callout(ctx, '銀河の中心の超大質量ブラックホール', 400 + R, 250 - R, 60, -60);
  }
  if (decay > 0.02 && decay < 0.98) {
    const r = rng(Math.floor(t * 4));
    for (let i = 0; i < 40; i++) disc(ctx, r() * W, r() * H, 1, rgba(r() > 0.5 ? '#ffe0a0' : '#a0d0ff', 0.6 * decay));
    label(ctx, '陽子が崩れて、星の残骸が光の粒になって消えていく', 400, H - 24, { size: 14, align: 'center', color: '#ffe0a0' });
  }
  if (sc.flyby) {
    const p = (t * 0.12) % 1;
    const ax = lerp(120, 680, p), ay = 120 + Math.sin(p * Math.PI) * 30;
    glow(ctx, 400, 300, 26, '#ffd0a0', 0.8); disc(ctx, 400, 300, 4, '#fff');
    glow(ctx, ax, ay, 22, '#ffb090', 0.8); disc(ctx, ax, ay, 3.5, '#fff');
    ctx.strokeStyle = 'rgba(160,200,255,.35)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.ellipse(400, 300, 70, 26, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const fly = smooth(0.45, 1, p);
    const px = lerp(400 + Math.cos(t) * 70, 760, fly), py = lerp(300 + Math.sin(t) * 26, 470, fly);
    disc(ctx, px, py, 4, '#7aa0ff');
    callout(ctx, '通りすがりの星', ax, ay, 20, -50);
    callout(ctx, 'はじき出される惑星', px, py, -80, 20);
  }
  if (sc.eject) label(ctx, '銀河から飛び出していく星の残骸', 400, H - 26, { size: 14, align: 'center', color: '#d8c8ff' });
  if (sc.note) label(ctx, sc.note, 400, 26, { size: 14, align: 'center', color: '#d8c8ff' });
}

// ---------- ブラックホールの時代 ----------
const BHS = [[68.76, 220, 300, 14, '3太陽質量'], [99.13, 520, 200, 34, 'S5 0014+81'], [106.23, 400, 330, 58, '太陽の20兆倍']];
export function blackholes(ctx, sc, env) {
  const t = env.t, L = env.L;
  black(ctx, '#000');
  for (const [end, x, y, R, name] of BHS) {
    const left = end - L;
    if (left < -0.3) continue;
    if (left < 0) { const k = 1 + left / 0.3; glow(ctx, x, y, 140 * (1 - k) + 20, '#ffffff', k); continue; }
    const hot = 1 - smooth(0, 3, left);
    const r = R * (0.4 + 0.6 * smooth(0, 6, left));
    if (hot > 0) glow(ctx, x, y, r * 3, ramp([[0, '#ff3a20'], [0.6, '#ffb060'], [1, '#ffffff']], hot), 0.8 * hot);
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.3);
    ctx.strokeStyle = rgba('#ff9a50', 0.12); ctx.lineWidth = r * 0.5; ctx.beginPath(); ctx.arc(0, 0, r * 2, 0, TAU); ctx.stroke();
    ctx.restore();
    disc(ctx, x, y, r, '#000');
    ctx.strokeStyle = rgba('#ffd8a0', 0.4 + 0.4 * hot); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, TAU); ctx.stroke();
    if (sc.focus === name || hot > 0.5) callout(ctx, `${name}${hot > 0.5 ? '(ホーキング放射で蒸発)' : ''}`, x + r, y - r, 40, -40);
  }
  if (sc.note) label(ctx, sc.note, 400, H - 24, { size: 14, align: 'center', color: '#ffd8a0' });
}

// ---------- 暗黒の時代 ----------
export function dark(ctx, sc, env) {
  const t = env.t;
  black(ctx, '#000');
  const r = rng(90);
  for (let i = 0; i < 50; i++) {
    const x = (r() * W + t * (r() - 0.5) * 6 + W) % W, y = (r() * H + t * (r() - 0.5) * 6 + H) % H;
    disc(ctx, x, y, 0.8, rgba(r() > 0.5 ? '#6a8aff' : '#ff8a6a', sc.fx === 'heatdeath' ? 0.12 : 0.3));
  }
  const cx = 400, cy = 250;
  if (sc.fx === 'iron') {
    glow(ctx, cx, cy, 160, '#7a5040', 0.15);
    ball(ctx, cx, cy, 110, '#8a8a90', '#1a1614', [-0.5, -0.5]);
    const rr = rng(4); ctx.globalAlpha = 0.35;
    for (let i = 0; i < 16; i++) { const a = rr() * TAU, d = rr() * 90; disc(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 4 + rr() * 12, '#6a4030'); }
    ctx.globalAlpha = 1;
    callout(ctx, '鉄の星(鉄56のかたまり)', cx + 80, cy - 80, 60, -50);
  } else if (sc.fx === 'collapse') {
    const xs = [170, 400, 630];
    ball(ctx, xs[0], cy, 60, '#8a8a90', '#1a1614'); label(ctx, '鉄の星', xs[0], cy + 90, { size: 14, align: 'center' });
    glow(ctx, xs[1], cy, 40, '#9fc4ff', 0.8); disc(ctx, xs[1], cy, 10, '#e0ecff'); label(ctx, '中性子星', xs[1], cy + 90, { size: 14, align: 'center' });
    disc(ctx, xs[2], cy, 26, '#000'); ctx.strokeStyle = 'rgba(255,210,160,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(xs[2], cy, 28, 0, TAU); ctx.stroke(); label(ctx, 'ブラックホール', xs[2], cy + 90, { size: 14, align: 'center' });
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    for (const x of [285, 515]) poly(ctx, [[x - 18, cy - 8], [x + 10, cy - 8], [x + 10, cy - 16], [x + 26, cy], [x + 10, cy + 16], [x + 10, cy + 8], [x - 18, cy + 8]], 'rgba(255,255,255,.45)');
    label(ctx, '量子トンネル効果で、ありえないほどゆっくり崩れる', cx, 70, { size: 14, align: 'center', color: '#cfd8ff' });
  } else if (sc.fx === 'brain') {
    const rr = rng(13), pts = [];
    for (let i = 0; i < 140; i++) { const a = rr() * TAU, d = Math.sqrt(rr()); pts.push([cx + Math.cos(a) * d * 150 * (1 + 0.15 * Math.sin(a * 3)), cy + Math.sin(a) * d * 100]); }
    const flick = 0.5 + 0.5 * Math.sin(t * 2);
    ctx.lineWidth = 0.8;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
      if (d < 34) { ctx.strokeStyle = `rgba(190,170,255,${0.25 * (1 - d / 34) * (0.5 + flick * 0.5)})`; ctx.beginPath(); ctx.moveTo(...pts[i]); ctx.lineTo(...pts[j]); ctx.stroke(); }
    }
    for (const [x, y] of pts) disc(ctx, x, y, 1.6, `rgba(220,210,255,${0.4 + 0.5 * flick * rr()})`);
    label(ctx, '真空のゆらぎから偶然できる「意識」(ボルツマン脳)', cx, H - 40, { size: 14, align: 'center', color: '#d8ccff' });
  } else if (sc.fx === 'decay') {
    const rr = rng(Math.floor(t * 2));
    for (let i = 0; i < 18; i++) { const x = 140 + (i % 6) * 104, y = 150 + Math.floor(i / 6) * 100; if (rr() < 0.5) { ball(ctx, x, y, 16, '#ff9a8a', '#5a1a14'); label(ctx, '核子', x, y + 30, { size: 11, align: 'center', alpha: 0.6 }); } else glow(ctx, x, y, 22, '#ffe0a0', 0.6); }
  } else if (sc.fx === 'heatdeath') {
    label(ctx, '……', cx, cy, { size: 40, align: 'center', color: '#3a3a4a' });
  } else if (sc.fx === 'bigbang') {
    const p = (t * 0.18) % 1.4, k = Math.min(1, p);
    const R = 10 + k * 520;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, `rgba(255,255,255,${1 - k * 0.5})`); g.addColorStop(0.2, `rgba(255,220,150,${0.9 - k * 0.4})`); g.addColorStop(0.55, `rgba(255,90,140,${0.6 - k * 0.3})`); g.addColorStop(1, 'rgba(60,40,160,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (k > 0.5) stars(ctx, (k - 0.5) * 2, 101, 300, [0, 0, W, H], t);
  }
  if (sc.note) label(ctx, sc.note, cx, 30, { size: 14, align: 'center', color: '#9aa4c8' });
}

// ---------- 探査機 ----------
export function probe(ctx, sc, env) {
  const t = env.t;
  black(ctx);
  stars(ctx, 1, 71, 300, [0, 0, W, H], t);
  if (sc.radio) {
    const cl = [640, 220];
    const r = rng(9);
    glow(ctx, cl[0], cl[1], 110, '#fff0d0', 0.4);
    for (let i = 0; i < 500; i++) { const u = r(), v = r(), g = Math.sqrt(-2 * Math.log(u + 1e-9)) * 26; disc(ctx, cl[0] + g * Math.cos(TAU * v), cl[1] + g * Math.sin(TAU * v), 1, 'rgba(255,240,220,.8)'); }
    callout(ctx, '球状星団 M13(約2万5000光年先)', cl[0], cl[1] + 60, -40, 80);
    for (let k = 0; k < 6; k++) { const p = ((t * 0.15 + k / 6) % 1); ctx.strokeStyle = `rgba(140,220,255,${0.6 * (1 - p)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(80, 300, 40 + p * 520, -0.55, -0.05); ctx.stroke(); }
    // アレシボ・メッセージの見た目(1679ビット=23×73)を模した点の列。中身の再現ではない
    const rr = rng(1679);
    for (let i = 0; i < 23 * 30; i++) if (rr() < 0.3) { ctx.fillStyle = 'rgba(140,220,255,.85)'; ctx.fillRect(40 + (i % 23) * 4, 60 + Math.floor(i / 23) * 4, 3, 3); }
    label(ctx, 'アレシボ・メッセージ(1974年)', 40, 46, { size: 13, color: '#9fe3ff' });
    return;
  }
  if (sc.target) {
    const [name, col, dist] = sc.target;
    glow(ctx, 610, 200, 120, col, 0.7); disc(ctx, 610, 200, 10, '#ffffff');
    callout(ctx, name, 610, 200, 40, 60);
    if (dist) { ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(250, 320); ctx.lineTo(600, 210); ctx.stroke(); ctx.setLineDash([]); label(ctx, dist, 430, 285, { size: 14, align: 'center', color: '#ffe8b0' }); }
  }
  const px = 200, py = 330;
  if (sc.craft === 'voyager') {
    ctx.strokeStyle = '#b8b8c0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 120, py + 50); ctx.moveTo(px, py); ctx.lineTo(px + 70, py + 60); ctx.stroke();
    ctx.fillStyle = '#e8e8ee'; ctx.beginPath(); ctx.ellipse(px, py - 20, 48, 16, -0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8a8a96'; ctx.fillRect(px - 12, py - 10, 24, 18);
    disc(ctx, px + 2, py + 2, 6, '#d8a840');
    callout(ctx, sc.label || 'ボイジャー', px - 30, py - 30, -40, -60);
  } else if (sc.craft === 'pioneer') {
    ctx.fillStyle = '#e8e8ee'; ctx.beginPath(); ctx.ellipse(px, py - 10, 52, 18, -0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9a9aa6'; ctx.fillRect(px - 10, py - 4, 20, 16);
    ctx.strokeStyle = '#b8b8c0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - 10, py + 8); ctx.lineTo(px - 70, py + 40); ctx.moveTo(px + 10, py + 8); ctx.lineTo(px + 70, py + 40); ctx.stroke();
    disc(ctx, px - 70, py + 40, 6, '#777'); disc(ctx, px + 70, py + 40, 6, '#777');
    callout(ctx, sc.label || 'パイオニア', px - 30, py - 30, -40, -60);
  }
  if (sc.plaque != null) {
    const x = 470, y = 280, w = 260, h = 160, e = sc.plaque;
    ctx.fillStyle = '#c8a050'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = rgba('#5a3a10', 1 - e * 0.85); ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; ctx.beginPath(); ctx.moveTo(x + 70, y + 70); ctx.lineTo(x + 70 + Math.cos(a) * (30 + (i * 13) % 40), y + 70 + Math.sin(a) * (30 + (i * 13) % 40)); ctx.stroke(); }
    for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc(x + 30 + i * 22, y + 140, i === 3 ? 4 : 2.5, 0, TAU); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x + 30, y + 22, 9, 0, TAU); ctx.arc(x + 60, y + 22, 9, 0, TAU); ctx.stroke();
    const r = rng(5); for (let i = 0; i < 400 * e; i++) disc(ctx, x + r() * w, y + r() * h, 1 + r() * 2, 'rgba(110,80,40,.6)');
    label(ctx, '金属板(図柄は簡略化)', x, y - 14, { size: 13 });
  }
  if (sc.record) {
    const x = 590, y = 330, R = 100;
    disc(ctx, x, y, R, '#c9a040');
    for (let k = 20; k < R; k += 4) { ctx.strokeStyle = 'rgba(90,60,10,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, k, 0, TAU); ctx.stroke(); }
    disc(ctx, x, y, 14, '#8a6a20');
    glow(ctx, x - 40, y - 40, 50, '#fff6d0', 0.35);
    label(ctx, 'ゴールデンレコード', x, y + R + 18, { size: 13, align: 'center' });
  }
}

// ---------- 夜空の極 ----------
const POLES = {
  vega: ['ベガ', '#cfe0ff', false], thuban: ['トゥバン(りゅう座α星)', '#f4f0ff', false], polaris: ['ポラリス', '#fff6d8', false], canopus: ['カノープス', '#fff8f0', true],
};
export function polesky(ctx, sc, env) {
  const t = env.t, [name, col, south] = POLES[sc.pole];
  ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#02040c'], [1, '#101a38']]); ctx.fillRect(0, 0, W, H);
  const cx = 400, cy = 190, rot = t * 0.05;
  const r = rng(3);
  for (let i = 0; i < 160; i++) {
    const d = 20 + r() * 520, a = r() * TAU, len = 0.5 + r() * 0.4, b = 0.2 + r() * 0.6;
    ctx.strokeStyle = `rgba(220,230,255,${b * 0.6})`; ctx.lineWidth = 1 + r();
    ctx.beginPath(); ctx.arc(cx, cy, d, a + rot, a + rot + len); ctx.stroke();
  }
  // 天の極は星の真上ではなく、そばを通る
  const off = sc.pole === 'canopus' ? 60 : sc.pole === 'vega' ? 26 : 8;
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(cx, cy, off, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  const sx = cx + Math.cos(rot * 1.0) * off, sy = cy + Math.sin(rot * 1.0) * off;
  sparkle(ctx, sx, sy, 8, col);
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6); ctx.stroke();
  callout(ctx, name, sx, sy, 50, -60);
  label(ctx, south ? '+ は天の南極' : '+ は天の北極', cx + 14, cy + 16, { size: 12, alpha: 0.7 });
  ctx.fillStyle = '#05070c';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 420 + Math.sin(x * 0.02) * 12 + Math.sin(x * 0.07) * 6);
  ctx.lineTo(W, H); ctx.fill();
  label(ctx, south ? '南の空' : '北の空', 30, 30, { size: 15 });
}

// ---------- 日食と太陽面通過 ----------
export function transit(ctx, sc, env) {
  const t = env.t;
  black(ctx);
  stars(ctx, 0.5, 81, 120, [0, 0, W, H], t);
  const from = sc.from || 'earth';
  const cx = 400, cy = 250, R = from === 'earth' ? 150 : from === 'mars' ? 100 : 40;
  // 惑星の通過と重なる日食は、月が太陽にかかりかけた瞬間として描く
  const mo = sc.transit && sc.ecl && sc.ecl !== 'annular-only' ? R * 0.55 : 0;
  if (sc.ecl === 'total' && !mo) {
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + 0.1 * Math.sin(i); ctx.strokeStyle = 'rgba(230,240,255,.25)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.lineTo(cx + Math.cos(a) * R * (1.6 + (i % 3) * 0.3), cy + Math.sin(a) * R * (1.6 + (i % 3) * 0.3)); ctx.stroke(); }
    glow(ctx, cx, cy, R * 2, '#e8f0ff', 0.6);
  }
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0, '#fffbe6'); g.addColorStop(0.8, '#ffd27a'); g.addColorStop(1, '#ff9a3a');
  glow(ctx, cx, cy, R * 1.5, '#ffe8b0', sc.ecl === 'total' ? 0.2 : 0.5);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  if (sc.ecl === 'total') disc(ctx, cx + mo, cy + mo * 0.3, R * 1.02, '#000');
  if (sc.ecl === 'annular') disc(ctx, cx + mo, cy + mo * 0.3, R * 0.88, '#000');
  if (sc.ecl === 'annular-only') { disc(ctx, cx + 20, cy, R * 0.9, '#000'); }
  const dots = { mercury: ['水星', 3.2, [-0.45, 0.55]], venus: ['金星', 7, [0.35, -0.6]], earth: ['地球', 4, [-0.3, 0.3]], uranus: ['天王星', 2.4, [0.4, 0]] };
  for (const k of sc.transit || []) {
    const [n, s, [u, v]] = dots[k];
    const x = mo ? cx - R * (0.6 + Math.abs(v) * 0.1) : cx + u * R * 0.75, y = cy + v * R * (mo ? 0.45 : 0.75);
    disc(ctx, x, y, from === 'neptune' ? 2.4 : s, '#05050a');
    callout(ctx, n, x, y, x < cx ? -90 - R * 0.3 : 90 + R * 0.3, v < 0 ? -40 : 40);
  }
  if (sc.ecl === 'total') callout(ctx, mo ? '月(このあと皆既日食に)' : '月(皆既日食)', cx + mo + R * 0.7, cy + R * 0.7, 60, 40);
  if (sc.ecl === 'annular') callout(ctx, mo ? '月(このあと金環日食に)' : '月(金環日食)', cx + mo + R * 0.6, cy + R * 0.6, 70, 50);
  if (sc.ecl === 'annular-only') callout(ctx, '月が小さく見え、太陽を覆いきれない', cx + R * 0.5, cy + R * 0.75, 60, 60);
  const fromTxt = { earth: '地球から見た太陽', mars: '火星から見た太陽', neptune: '海王星から見た太陽(大きさは誇張)' }[from];
  label(ctx, fromTxt, 24, 30, { size: 15 });
}

// ---------- 配置図 ----------
export function orbit(ctx, sc, env) {
  const t = env.t, m = sc.mode, cx = 400, cy = 250;
  black(ctx, '#030611');
  ctx.strokeStyle = 'rgba(120,150,220,.08)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const sun = (x = cx, y = cy, r = 12) => { glow(ctx, x, y, r * 3, '#ffd27a', 0.7); disc(ctx, x, y, r, '#fff1c0'); };
  const ell = (a, b, col, dash, x = cx, y = cy, rot = 0) => { ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.ellipse(x, y, a, b, rot, 0, TAU); ctx.stroke(); ctx.setLineDash([]); };
  if (m === 'seasons') {
    sun(); ell(260, 150, 'rgba(160,190,255,.5)');
    const earthAt = (x, y, tilt, txt) => {
      ball(ctx, x, y, 16, '#7ab0ff', '#14305a');
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - Math.sin(tilt) * 30, y + Math.cos(tilt) * 30); ctx.lineTo(x + Math.sin(tilt) * 30, y - Math.cos(tilt) * 30); ctx.stroke();
      label(ctx, txt, x, y + 48, { size: 13, align: 'center' });
    };
    earthAt(cx - 250, cy, 0.41, '近日点: 北半球は夏');
    earthAt(cx + 260, cy, 0.41, '遠日点: 北半球は冬');
    label(ctx, 'いまは逆(近日点で北半球は冬)', cx, 70, { size: 15, align: 'center', color: '#ffe0a0' });
  } else if (m === 'ecc') {
    sun(cx + 0, cy, 10);
    const A = 190;
    ell(A, A * Math.sqrt(1 - (0.0167 * 12) ** 2), 'rgba(160,190,255,.6)', [5, 5], cx - A * 0.0167 * 12);
    ell(A, A * Math.sqrt(1 - (0.00236 * 12) ** 2), 'rgba(255,220,140,.9)', null, cx - A * 0.00236 * 12);
    label(ctx, '点線: いま(離心率 0.0167)', 20, 30, { size: 14, color: '#a0c0ff' });
    label(ctx, '実線: 2万7000年後(0.00236)', 20, 54, { size: 14, color: '#ffe0a0' });
    label(ctx, 'ずれは12倍に強調', 20, 78, { size: 12, alpha: 0.6 });
  } else if (m === 'comet') {
    sun(140, cy, 8);
    for (const a of [12, 22, 34]) ell(a, a, 'rgba(160,190,255,.4)', null, 140, cy);
    ell(330, 90, 'rgba(200,240,255,.6)', [4, 4], 140 + 320, cy);
    const x = 140 + 320 + 325, y = cy;
    disc(ctx, x - 8, y, 4, '#e8f6ff');
    callout(ctx, sc.label, x - 8, y, -60, -90);
    label(ctx, '太陽から最も遠い点(遠日点)で折り返す', cx, H - 30, { size: 14, align: 'center' });
  } else if (m === 'oort') {
    sun(cx, cy, 6);
    const r = rng(5);
    for (let i = 0; i < 700; i++) { const a = r() * TAU, d = 150 + r() * 70; disc(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9, 0.9, 'rgba(200,220,255,.5)'); }
    const p = (t * 0.06) % 1, sx = lerp(820, -20, p), sy = 70 + p * 80;
    glow(ctx, sx, sy, 20, '#ff8a5a', 0.9); disc(ctx, sx, sy, 5, '#ffd0b0');
    callout(ctx, 'グリーゼ710', sx, sy, 20, -40);
    for (let i = 0; i < 6; i++) { const a = -2.2 + i * 0.25, d = 140 - ((t * 20 + i * 15) % 100); ctx.strokeStyle = 'rgba(200,240,255,.6)'; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); ctx.lineTo(cx + Math.cos(a) * (d + 14), cy + Math.sin(a) * (d + 14)); ctx.stroke(); }
    label(ctx, 'オールトの雲(彗星の巣)', cx, cy + 235, { size: 14, align: 'center' });
  } else if (m === 'centaur' || m === 'chaos' || m === 'mercury') {
    sun(cx, cy, m === 'centaur' ? 6 : 10);
    const orbits = m === 'centaur' ? [40, 70, 130, 200] : [40, 72, 100, 150];
    orbits.forEach(a => ell(a, a, 'rgba(160,190,255,.35)'));
    const r = rng(m.length);
    if (m === 'centaur') {
      for (let i = 0; i < 7; i++) { const a = 90 + r() * 90; ell(a, a * (0.6 + r() * 0.3), `rgba(255,200,140,${0.4 + r() * 0.3})`, [3, 4], cx + (r() - 0.5) * 60, cy + (r() - 0.5) * 40, r() * 3); }
      label(ctx, 'ケンタウロス族: 木星と海王星の間をさまよう小天体', cx, 30, { size: 14, align: 'center' });
    } else if (m === 'chaos') {
      for (let k = 0; k < 4; k++) for (let i = 0; i < 6; i++) { const a = orbits[k]; ell(a * (1 + (r() - 0.5) * 0.25), a * (1 + (r() - 0.5) * 0.25), `rgba(255,220,140,${0.25})`, [2, 5], cx + (r() - 0.5) * 20, cy + (r() - 0.5) * 20, r() * 3); }
      label(ctx, '少しの誤差が育ち、軌道の予測が意味を失う', cx, 30, { size: 14, align: 'center' });
    } else {
      ell(110, 60, 'rgba(255,170,120,.9)', null, cx + 50, cy, 0.4);
      const a = t * 0.8; disc(ctx, cx + 50 + Math.cos(a) * 110 * Math.cos(0.4) - Math.sin(a) * 60 * Math.sin(0.4), cy + Math.cos(a) * 110 * Math.sin(0.4) + Math.sin(a) * 60 * Math.cos(0.4), 4, '#d0c8bc');
      label(ctx, '水星の軌道が細長くなり、金星や地球の軌道を横切る(確率約1%)', cx, 30, { size: 14, align: 'center' });
    }
  } else if (m === 'galactic') {
    const r = rng(3);
    glow(ctx, cx, cy, 90, '#ffe8c0', 0.8);
    for (let i = 0; i < 1400; i++) { const arm = i % 4, k = r(), a = k * 5 + arm * Math.PI / 2 + (r() - 0.5) * 0.5, d = 30 + k * 200; disc(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.95, 0.9, `rgba(230,225,255,${0.5 + r() * 0.3})`); }
    ell(140, 133, 'rgba(255,220,120,.6)', [5, 5]);
    const a = t * 0.3; disc(ctx, cx + Math.cos(a) * 140, cy + Math.sin(a) * 133, 4, '#ffe080');
    callout(ctx, '太陽系(1周 約2億4000万年)', cx + Math.cos(a) * 140, cy + Math.sin(a) * 133, 40, -40);
  } else if (m === 'tilt') {
    ball(ctx, cx, cy, 90, '#8a5a3a', '#2a1408');
    for (let i = 0; i < 6; i++) { const a = Math.sin(t * 0.6 + i * 1.3) * 1.1; ctx.strokeStyle = `rgba(255,255,255,${i === 0 ? 0.9 : 0.25})`; ctx.lineWidth = i === 0 ? 3 : 1.5; ctx.beginPath(); ctx.moveTo(cx - Math.sin(a) * 150, cy + Math.cos(a) * 150); ctx.lineTo(cx + Math.sin(a) * 150, cy - Math.cos(a) * 150); ctx.stroke(); }
    ball(ctx, cx + 300, cy - 120, 10, '#ccc', '#444');
    callout(ctx, '遠ざかった月(自転軸を支えられない)', cx + 300, cy - 120, -40, -60);
    label(ctx, '自転軸の傾きが大きく揺れ動く', cx, H - 30, { size: 14, align: 'center' });
  } else if (m === 'assist') {
    sun(cx, cy, 10);
    ctx.strokeStyle = 'rgba(160,200,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let a = 0; a < 5 * TAU; a += 0.05) { const d = 70 + a * 5; ctx.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85); } ctx.stroke();
    const a = 5 * TAU, d = 70 + a * 5;
    ball(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85, 8, '#7ab0ff', '#14305a');
    for (let i = 0; i < 4; i++) { const b = i * 1.4 + 0.5, dd = 90 + i * 30; ctx.strokeStyle = 'rgba(255,190,120,.6)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(cx + Math.cos(b) * (dd + 200), cy + Math.sin(b) * (dd + 200)); ctx.quadraticCurveTo(cx + Math.cos(b) * dd, cy + Math.sin(b) * dd * 0.85, cx + Math.cos(b + 0.6) * (dd + 200), cy + Math.sin(b + 0.6) * (dd + 200)); ctx.stroke(); ctx.setLineDash([]); }
    label(ctx, '小惑星を何度もすれ違わせ、地球の軌道を少しずつ外へ', cx, 30, { size: 14, align: 'center' });
  } else if (m === 'nearest') {
    sun(140, cy, 8);
    const list = sc.list || [];
    list.forEach(([n, ly, c], i) => { const x = 140 + ly * 100; glow(ctx, x, cy + (i - 1) * 50, 14, c, 0.8); disc(ctx, x, cy + (i - 1) * 50, 4, '#fff'); label(ctx, `${n} ${ly}光年`, x, cy + (i - 1) * 50 - 22, { size: 13, align: 'center' }); });
    label(ctx, '太陽', 140, cy + 30, { size: 13, align: 'center' });
  }
  if (sc.note) label(ctx, sc.note, cx, H - 24, { size: 14, align: 'center', color: '#ffe0a0' });
}
