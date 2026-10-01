// 人工物・記録媒体・暦・生き物など、天体以外の場面
import { W, H, TAU, clamp, lerp, smooth, rng, mix, rgba, glow, disc, ball, stars, label, callout, poly, vgrad, ridge } from './util.js';

const stage = (ctx, top = '#0b1020', bottom = '#1a2238') => {
  ctx.fillStyle = vgrad(ctx, 0, H, [[0, top], [1, bottom]]); ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(400, 200, 20, 400, 200, 360);
  g.addColorStop(0, 'rgba(255,240,210,.16)'); g.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(400, 420, 220, 26, 0, 0, TAU); ctx.fill();
};

function clockFace(ctx, x, y, R, marks, hand, labelTxt) {
  disc(ctx, x, y, R, '#f2ead8'); ctx.strokeStyle = '#3a3428'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
  for (let i = 0; i < marks; i++) { const a = i / marks * TAU - Math.PI / 2; ctx.lineWidth = i % (marks / 4 | 1) === 0 ? 3 : 1.4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * 0.82, y + Math.sin(a) * R * 0.82); ctx.lineTo(x + Math.cos(a) * R * 0.93, y + Math.sin(a) * R * 0.93); ctx.stroke(); }
  const a = hand - Math.PI / 2; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * R * 0.7, y + Math.sin(a) * R * 0.7); ctx.stroke();
  disc(ctx, x, y, 5, '#3a3428');
  if (labelTxt) label(ctx, labelTxt, x, y + R * 0.4, { size: 15, align: 'center', color: '#3a3428', shadow: false });
}

export function artifact(ctx, sc, env) {
  const t = env.t, it = sc.item;
  stage(ctx);
  if (it === 'clock') {
    // ロング・ナウ時計: 縦長の機構と、ゆっくり回る文字盤
    ctx.fillStyle = '#5a5248'; ctx.fillRect(370, 40, 60, 330);
    for (let i = 0; i < 6; i++) { ctx.strokeStyle = '#b8a888'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(400, 80 + i * 40, 50, 10, 0, 0, TAU); ctx.stroke(); }
    clockFace(ctx, 400, 330, 70, 12, t * 0.05, '');
    label(ctx, '1万年動くように作られている時計(ロング・ナウ協会)', 400, 450, { size: 14, align: 'center' });
  } else if (it === 'clock24' || it === 'clock25') {
    const is25 = it === 'clock25';
    clockFace(ctx, 400, 230, 150, is25 ? 25 : 24, is25 ? TAU * 24.6 / 25 : TAU * 0.999, is25 ? '1日 = 25時間' : '1日 = 86,401秒');
    label(ctx, is25 ? '地球の自転が遅くなり、1日が1時間長くなる' : '毎日うるう秒を足す必要が出てくる', 400, 440, { size: 14, align: 'center' });
  } else if (it === 'vault') {
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#071028'], [1, '#203050']]); ctx.fillRect(0, 0, W, H);
    stars(ctx, 0.7, 5, 120, [0, 0, W, 260], t);
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(90,255,170,${0.18 + 0.08 * Math.sin(t + i)})`; ctx.lineWidth = 26 - i * 6; ctx.beginPath(); ctx.moveTo(0, 120 + i * 20); ctx.bezierCurveTo(250, 40, 500, 200, 800, 90 + i * 15); ctx.stroke(); }
    ridge(ctx, 7, 360, 150, '#dfe8f2', 0.7);
    ctx.fillStyle = '#e8eef4'; ctx.fillRect(0, 380, W, H);
    poly(ctx, [[340, 400], [380, 230], [420, 230], [460, 400]], '#8c949e');
    poly(ctx, [[380, 230], [420, 230], [418, 250], [382, 250]], '#5ad8c8');
    ctx.fillStyle = '#3a4048'; ctx.fillRect(386, 330, 28, 70);
    label(ctx, 'スヴァールバル世界種子貯蔵庫(ノルウェー)', 400, 450, { size: 14, align: 'center', color: '#203040', shadow: false });
  } else if (it === 'tablet') {
    for (let i = 0; i < 5; i++) {
      const x = 260 + i * 70, y = 170 + (i % 2) * 20;
      ctx.save(); ctx.translate(x, y); ctx.rotate((i - 2) * 0.05);
      ctx.fillStyle = '#e8dcc6'; ctx.fillRect(-40, -60, 80, 200);
      ctx.fillStyle = '#7a6a54'; for (let k = 0; k < 18; k++) ctx.fillRect(-30, -50 + k * 10, 20 + ((k * 37 + i * 11) % 40), 3);
      ctx.restore();
    }
    label(ctx, '粘土を焼いた陶板に文字を刻んで、岩塩坑に保管する(人類の記憶)', 400, 450, { size: 14, align: 'center' });
  } else if (it === 'hdp' || it === 'glass5d') {
    const glass = it === 'glass5d';
    const R = 130;
    ctx.save(); ctx.translate(400, 220); ctx.scale(1, 0.55);
    const g = ctx.createLinearGradient(-R, -R, R, R);
    if (glass) { ['#9fe3ff', '#d0a0ff', '#ffd0a0', '#a0ffd0'].forEach((c, i) => g.addColorStop(i / 3, rgba(c, 0.5))); }
    else { g.addColorStop(0, '#5a6a8a'); g.addColorStop(1, '#1a2238'); }
    disc(ctx, 0, 0, R, g);
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    if (glass) { const r = rng(9); for (let i = 0; i < 300; i++) disc(ctx, (r() - 0.5) * R * 1.6, (r() - 0.5) * R * 1.6, 1.2, `rgba(255,255,255,${0.4 * r()})`); }
    else { ctx.strokeStyle = 'rgba(220,230,255,.35)'; for (let k = 20; k < R; k += 7) { ctx.beginPath(); ctx.arc(0, 0, k, 0, TAU); ctx.stroke(); } }
    ctx.restore();
    glow(ctx, 340, 180, 60, '#ffffff', 0.25);
    label(ctx, glass ? 'ガラスの中にレーザーで書き込む5次元データストレージ' : 'ヒューマン・ドキュメント・プロジェクト(100万年残す記録)', 400, 450, { size: 14, align: 'center' });
  } else if (it === 'shuttle') {
    ctx.save(); ctx.translate(400, 230);
    for (let k = 0; k < 2; k++) { ctx.strokeStyle = 'rgba(160,200,255,.6)'; ctx.lineWidth = 1; for (let x = -260; x <= 260; x += 14) { ctx.beginPath(); ctx.moveTo(x, k ? 50 : -50); ctx.lineTo(x + 7, k ? 42 : -42); ctx.lineTo(x + 14, k ? 50 : -50); ctx.stroke(); } }
    ctx.strokeStyle = 'rgba(160,200,255,.25)'; ctx.beginPath(); ctx.ellipse(-260, 0, 12, 50, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(260, 0, 12, 50, 0, 0, TAU); ctx.stroke();
    const x = Math.sin(t * 0.5) > 0 ? 160 : -160;
    ball(ctx, x, 0, 30, '#c8a890', '#4a2a18');
    ctx.restore();
    label(ctx, '炭素ナノチューブの中を行き来する鉄の粒で 0 と 1 を表す(分子シャトル)', 400, 440, { size: 14, align: 'center' });
  } else if (it === 'lease') {
    ctx.save(); ctx.translate(400, 220); ctx.rotate(-0.04);
    ctx.fillStyle = '#efe0bc'; ctx.fillRect(-170, -140, 340, 280);
    ctx.fillStyle = '#d8c49a'; ctx.fillRect(-180, -150, 360, 20); ctx.fillRect(-180, 130, 360, 20);
    ctx.fillStyle = 'rgba(80,60,30,.6)'; for (let k = 0; k < 14; k++) ctx.fillRect(-140, -110 + k * 15, 160 + ((k * 53) % 120), 3);
    disc(ctx, 120, 90, 26, '#a02a20');
    ctx.restore();
    label(ctx, '1759年に結ばれた9000年の借地契約', 400, 450, { size: 14, align: 'center' });
  } else if (it === 'cf4') {
    const c = [400, 230];
    const fs = [[0, -120], [-110, 50], [110, 50], [20, 110]];
    for (const [dx, dy] of fs) { ctx.strokeStyle = '#c8d0e0'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(...c); ctx.lineTo(c[0] + dx, c[1] + dy); ctx.stroke(); }
    ball(ctx, c[0], c[1], 44, '#6a6e78', '#14161c');
    for (const [dx, dy] of fs) { ball(ctx, c[0] + dx, c[1] + dy, 32, '#b8f0a0', '#2a5a20'); label(ctx, 'F', c[0] + dx, c[1] + dy, { size: 20, align: 'center', color: '#103010', shadow: false }); }
    label(ctx, 'C', c[0], c[1], { size: 22, align: 'center' });
    label(ctx, '四フッ化炭素(CF₄): 人がつくった、最も長く残る温室効果ガス', 400, 450, { size: 14, align: 'center' });
  }
}

export function strata(ctx, sc, env) {
  const cols = ['#c9a77a', '#a88a62', '#d4b98e', '#8f7454', '#bfa178', '#9a7e5a', '#c4ab84'];
  ctx.fillStyle = vgrad(ctx, 0, 60, [[0, '#7fb0e0'], [1, '#bcd8f0']]); ctx.fillRect(0, 0, W, 60);
  for (let i = 0; i < 7; i++) {
    const y0 = 60 + i * 64;
    ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(0, y0 + Math.sin(i) * 6);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, y0 + Math.sin(x * 0.01 + i) * 6);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  }
  if (sc.mode === 'city') {
    const y = 300;
    ctx.fillStyle = 'rgba(70,60,60,.85)';
    for (let i = 0; i < 12; i++) { const x = 40 + i * 62; ctx.fillRect(x, y - 10 - (i % 3) * 6, 40, 14 + (i % 3) * 6); }
    ctx.strokeStyle = 'rgba(60,60,80,.9)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, y + 26); ctx.lineTo(W, y + 26); ctx.stroke();
    ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(60 + i * 95, y + 26); ctx.lineTo(60 + i * 95, y + 60); ctx.stroke(); }
    callout(ctx, '化石になった都市の層(建物の基礎・共同溝)', 420, y + 26, 60, 90, { color: '#fff4dc' });
  } else {
    for (let i = 0; i < 3; i++) { ctx.fillStyle = '#1c1612'; ctx.fillRect(0, 200 + i * 90, W, 10 + i * 3); }
    const r = rng(8); for (let i = 0; i < 30; i++) disc(ctx, r() * W, 360 + r() * 120, 3 + r() * 4, 'rgba(30,24,16,.8)');
    callout(ctx, '石炭の層', 600, 205, 40, -80, { color: '#fff4dc' });
    callout(ctx, '石油', 300, 420, -60, 40, { color: '#fff4dc' });
    label(ctx, '植物やプランクトンの遺骸が、長い時間をかけて燃料になる', 400, 30, { size: 14, align: 'center', color: '#203040', shadow: false });
  }
}

const trefoil = (ctx, x, y, R) => {
  disc(ctx, x, y, R * 1.15, '#f2c81a');
  ctx.fillStyle = '#111';
  for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R, a - 0.52, a + 0.52); ctx.closePath(); ctx.fill(); }
  disc(ctx, x, y, R * 0.25, '#f2c81a'); disc(ctx, x, y, R * 0.17, '#111');
};

export function nuclear(ctx, sc, env) {
  const t = env.t, it = sc.item;
  if (it === 'spikes') {
    ctx.fillStyle = vgrad(ctx, 0, 330, [[0, '#6a8ab0'], [1, '#e8d8b8']]); ctx.fillRect(0, 0, W, 330);
    ctx.fillStyle = '#c8a878'; ctx.fillRect(0, 330, W, H);
    const r = rng(3);
    for (let i = 0; i < 60; i++) { const x = r() * W, y = 340 + r() * 160, h = 40 + (y - 330) * 0.8; poly(ctx, [[x - 4, y], [x + r() * 20 - 10, y - h], [x + 4, y]], '#3a3430'); }
    trefoil(ctx, 640, 120, 50);
    label(ctx, '1万年後の人にも「危険」と伝わるよう考えられた標識の案', 400, 30, { size: 14, align: 'center', color: '#102030', shadow: false });
  } else if (it === 'pripyat') {
    ctx.fillStyle = vgrad(ctx, 0, 330, [[0, '#9fc8e8'], [1, '#e8f0e0']]); ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#b84a3a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(420, 200, 110, 0, TAU); ctx.stroke();
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(420, 200); ctx.lineTo(420 + Math.cos(a) * 110, 200 + Math.sin(a) * 110); ctx.stroke(); ctx.fillStyle = '#e8c040'; ctx.fillRect(420 + Math.cos(a) * 110 - 7, 200 + Math.sin(a) * 110, 14, 14); }
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(360, 360); ctx.lineTo(420, 200); ctx.lineTo(480, 360); ctx.stroke();
    const r = rng(6);
    for (let i = 0; i < 40; i++) { const x = r() * W, y = 300 + r() * 200, s = 40 + r() * 60; disc(ctx, x, y - s * 0.6, s * 0.6, rgba(r() > 0.5 ? '#3f7a3a' : '#5a9a48', 0.95)); }
    label(ctx, 'チェルノブイリ立入禁止区域(プリピャチの観覧車)', 400, 30, { size: 14, align: 'center', color: '#102030', shadow: false });
  } else if (it === 'decay') {
    ctx.fillStyle = '#0a0f1c'; ctx.fillRect(0, 0, W, H);
    const [sym, hl] = sc.iso;
    const x0 = 90, y0 = 400, w = 640, h = 300;
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0 - h); ctx.lineTo(x0, y0); ctx.lineTo(x0 + w, y0); ctx.stroke();
    ctx.strokeStyle = '#7fe0c0'; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 100; i++) { const u = i / 100 * 4; ctx.lineTo(x0 + i / 100 * w, y0 - h * Math.pow(0.5, u)); } ctx.stroke();
    for (let k = 1; k <= 3; k++) { const x = x0 + k / 4 * w, y = y0 - h * Math.pow(0.5, k); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y); ctx.lineTo(x0, y); ctx.stroke(); ctx.setLineDash([]); label(ctx, `${k}×${hl}`, x, y0 + 18, { size: 12, align: 'center' }); }
    label(ctx, '残る量', x0 - 10, y0 - h - 16, { size: 13 });
    label(ctx, '1/2', x0 - 8, y0 - h / 2, { size: 12, align: 'right' });
    trefoil(ctx, 680, 110, 28);
    label(ctx, sym, 560, 110, { size: 30, align: 'center', color: '#7fe0c0' });
  } else if (it === 'sea' || it === 'fuel') {
    ctx.fillStyle = vgrad(ctx, 0, 200, [[0, '#7ab8e8'], [1, '#cfe6f6']]); ctx.fillRect(0, 0, W, 200);
    ctx.fillStyle = vgrad(ctx, 200, H, [[0, '#1d6aa8'], [1, '#08284a']]); ctx.fillRect(0, 200, W, H);
    const r = rng(2);
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = 230 + ((r() * 270 - t * 12 * (0.5 + r())) % 270 + 270) % 270;
      disc(ctx, x, y, 14, 'rgba(255,255,255,.12)'); label(ctx, sc.sym, x, y, { size: 13, align: 'center', color: '#e8f6ff' });
    }
    label(ctx, sc.caption, 400, 100, { size: 16, align: 'center', color: '#102840', shadow: false });
  }
}

const person = (ctx, x, y, s, col, opt = {}) => {
  const hw = opt.w ?? 1, hh = opt.h ?? 1;
  disc(ctx, x, y - 70 * s * hh, 11 * s * (opt.head ?? 1), col);
  ctx.strokeStyle = col; ctx.lineWidth = 9 * s * hw; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y - 56 * s * hh); ctx.lineTo(x, y - 24 * s * hh);
  ctx.moveTo(x, y - 24 * s * hh); ctx.lineTo(x - 9 * s * hw, y); ctx.moveTo(x, y - 24 * s * hh); ctx.lineTo(x + 9 * s * hw, y);
  ctx.moveTo(x - 16 * s * hw, y - 48 * s * hh); ctx.lineTo(x + 16 * s * hw, y - 48 * s * hh); ctx.stroke(); ctx.lineCap = 'butt';
};

export function human(ctx, sc, env) {
  const t = env.t, it = sc.item;
  if (it === 'dish') {
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#02040c'], [1, '#18244a']]); ctx.fillRect(0, 0, W, H);
    stars(ctx, 1, 9, 260, [0, 0, W, 380], t);
    ctx.fillStyle = '#0a0d16'; ctx.fillRect(0, 400, W, H);
    ctx.save(); ctx.translate(360, 330); ctx.rotate(-0.5);
    ctx.fillStyle = '#c8ccd8'; ctx.beginPath(); ctx.ellipse(0, 0, 110, 36, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#c8ccd8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-60, 20); ctx.lineTo(0, -70); ctx.lineTo(60, 20); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#9aa0ae'; ctx.fillRect(345, 340, 30, 60);
    for (let k = 0; k < 5; k++) { const p = (t * 0.2 + k / 5) % 1; ctx.strokeStyle = `rgba(160,220,255,${0.5 * (1 - p)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(330, 300, 40 + p * 400, -1.6, -0.6); ctx.stroke(); }
    label(ctx, 'N = R* × fp × ne × fl × fi × fc × L', 400, 36, { size: 18, align: 'center', color: '#bfe6ff' });
    label(ctx, 'L: 技術文明が電波を出し続ける年数', 400, 64, { size: 13, align: 'center', alpha: 0.8 });
  } else if (it === 'genes') {
    ctx.fillStyle = '#0c1424'; ctx.fillRect(0, 0, W, H);
    const r = rng(4), cols = ['#ff8a6a', '#ffd06a', '#7ad0ff', '#9aff8a', '#d08aff'];
    const mixK = 0.5 + 0.5 * Math.sin(t * 0.3);
    for (let i = 0; i < 160; i++) {
      const g = i % 5, hx = 140 + g * 130, hy = 250;
      const x = lerp(hx + (r() - 0.5) * 100, 60 + r() * 680, mixK), y = lerp(hy + (r() - 0.5) * 200, 60 + r() * 380, mixK);
      disc(ctx, x, y, 5, cols[g]);
    }
    label(ctx, '地域ごとのかたよりが消え、特徴は世界中に散らばる', 400, 470, { size: 14, align: 'center' });
  } else if (it === 'doom') {
    ctx.fillStyle = '#0a0f1c'; ctx.fillRect(0, 0, W, H);
    const x0 = 90, y0 = 420, w = 620, h = 330;
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.moveTo(x0, y0 - h); ctx.lineTo(x0, y0); ctx.lineTo(x0 + w, y0); ctx.stroke();
    ctx.strokeStyle = '#ffb48a'; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 100; i++) { const u = i / 100; ctx.lineTo(x0 + u * w, y0 - h * (1 - Math.pow(1 - u, 2.2))); } ctx.stroke();
    const xn = x0 + w * 0.05; ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(xn, y0); ctx.lineTo(xn, y0 - h); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, 'いま', xn, y0 + 18, { size: 13, align: 'center' });
    label(ctx, 'これまでに生まれた人の数(累計)', x0, y0 - h - 18, { size: 13 });
    label(ctx, '「自分が人類の歴史のどのあたりにいるか」から終わりを見積もる', 400, 30, { size: 14, align: 'center', color: '#ffd8c0' });
    if (sc.who) label(ctx, sc.who, x0 + w, y0 + 40, { size: 13, align: 'right', alpha: 0.7 });
  } else if (it === 'words') {
    ctx.fillStyle = '#10141e'; ctx.fillRect(0, 0, W, H);
    const words = [['水', '???'], ['火', '???'], ['目', '???'], ['手', '???'], ['石', '???'], ['夜', '???'], ['鳥', '???'], ['二', '二']];
    const k = 0.5 + 0.5 * Math.sin(t * 0.5);
    words.forEach(([a, b], i) => { const x = 130 + (i % 4) * 180, y = 170 + Math.floor(i / 4) * 150; label(ctx, k > 0.5 ? b : a, x, y, { size: 44, align: 'center', color: b === a ? '#ffe08a' : '#cfe0ff', alpha: 0.3 + 0.7 * Math.abs(k - 0.5) * 2 }); });
    label(ctx, '基礎語彙100語のうち、いまの形で残るのは1語ほど', 400, 450, { size: 14, align: 'center' });
  } else if (it === 'colonize') {
    ctx.fillStyle = '#010208'; ctx.fillRect(0, 0, W, H);
    const r = rng(3), cx = 400, cy = 250, reach = sc.reach ?? 1;
    glow(ctx, cx, cy, 80, '#ffe8c0', 0.7);
    for (let i = 0; i < 1600; i++) {
      const arm = i % 4, k = r(), a = k * 5 + arm * Math.PI / 2 + (r() - 0.5) * 0.5, d = 20 + k * 220;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.9;
      const sx = cx + 140, sy = cy + 30, dd = Math.hypot(x - sx, y - sy);
      const on = dd < reach * 420 * (0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.4)));
      disc(ctx, x, y, on ? 1.6 : 0.9, on ? 'rgba(120,255,190,.9)' : 'rgba(220,220,255,.5)');
    }
    callout(ctx, '太陽系', cx + 140, cy + 30, 50, 60);
    label(ctx, '緑: 人類が広がった星系', 20, 30, { size: 14, color: '#8affc0' });
  } else if (it === 'species') {
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#0a0c1a'], [1, '#26203a']]); ctx.fillRect(0, 0, W, H);
    stars(ctx, 0.8, 3, 160, [0, 0, W, 300], t);
    const vars = [[{ h: 1.3, w: 0.7 }, '#ffb48a'], [{ h: 0.8, w: 1.3 }, '#8ad0ff'], [{ h: 1, w: 1, head: 1.5 }, '#b0ff9a'], [{ h: 1.5, w: 0.6, head: 0.8 }, '#ffd86a'], [{ h: 0.9, w: 1.1 }, '#d0a0ff']];
    vars.forEach(([o, c], i) => { const x = 120 + i * 140; disc(ctx, x, 420, 50, 'rgba(255,255,255,.06)'); person(ctx, x, 400, 1.6, c, o); });
    label(ctx, '隔離された星々で、別々の人類へ分かれていく', 400, 460, { size: 14, align: 'center' });
  }
}

export function bio(ctx, sc, env) {
  const t = env.t, it = sc.item;
  if (it === 'reef') {
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#1c8ac0'], [1, '#06304e']]); ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(255,255,255,${0.05 + 0.03 * Math.sin(t + i)})`; poly(ctx, [[100 + i * 120, 0], [140 + i * 120, 0], [60 + i * 120 + Math.sin(t) * 20, 400], [20 + i * 120, 400]]); ctx.fill(); }
    ctx.fillStyle = '#d8c8a0'; ctx.fillRect(0, 430, W, 70);
    const r = rng(5), k = sc.grow ?? 1;
    for (let i = 0; i < 18; i++) {
      const x = 30 + i * 44 + r() * 20, s = (30 + r() * 40) * k, c = ['#ff7a8a', '#ffb05a', '#c07aff', '#5affc0'][i % 4];
      ctx.strokeStyle = c; ctx.lineWidth = 6; ctx.lineCap = 'round';
      const br = (x0, y0, a, l, d) => { if (d > 3) return; const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); br(x1, y1, a - 0.5, l * 0.7, d + 1); br(x1, y1, a + 0.4, l * 0.7, d + 1); };
      br(x, 440, -Math.PI / 2, s, 0); ctx.lineCap = 'butt';
    }
    for (let i = 0; i < 8; i++) { const x = (i * 110 + t * 30) % 880 - 40, y = 120 + (i % 3) * 70; ctx.fillStyle = '#ffd86a'; ctx.beginPath(); ctx.ellipse(x, y, 14, 7, 0, 0, TAU); ctx.fill(); poly(ctx, [[x - 12, y], [x - 24, y - 8], [x - 24, y + 8]], '#ffd86a'); }
    label(ctx, '海の酸性化から、サンゴ礁がもとに戻るまで', 400, 30, { size: 14, align: 'center' });
  } else if (it === 'worm') {
    ctx.fillStyle = vgrad(ctx, 0, 120, [[0, '#7ab0e0'], [1, '#cfe4f4']]); ctx.fillRect(0, 0, W, 120);
    ctx.fillStyle = '#4f8a3a'; ctx.fillRect(0, 110, W, 16);
    ctx.fillStyle = vgrad(ctx, 126, H, [[0, '#6a4a2e'], [1, '#3a2614']]); ctx.fillRect(0, 126, W, H);
    const r = rng(7); for (let i = 0; i < 60; i++) disc(ctx, r() * W, 140 + r() * 360, 2 + r() * 5, 'rgba(160,130,100,.4)');
    ctx.strokeStyle = '#d88a8a'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); for (let x = 0; x <= 260; x += 6) ctx.lineTo(260 + x, 300 + Math.sin(x * 0.04 + t * 1.5) * 18); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(560, 300); ctx.lineTo(720, 300); ctx.lineTo(706, 290); ctx.moveTo(720, 300); ctx.lineTo(706, 310); ctx.stroke();
    label(ctx, '北へ 年10m', 640, 280, { size: 14, align: 'center', color: '#ffe08a' });
  } else if (it === 'extinction') {
    ctx.fillStyle = '#0e1410'; ctx.fillRect(0, 0, W, H);
    const r = rng(11);
    const tree = (x, y, a, l, d) => {
      if (d > 7) return;
      const x1 = x + Math.cos(a) * l, y1 = y + Math.sin(a) * l;
      const dead = d >= 4 && r() < 0.5;
      ctx.strokeStyle = dead ? 'rgba(160,140,120,.35)' : `rgba(120,230,140,${0.5 + d * 0.06})`; ctx.lineWidth = Math.max(1, 6 - d);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x1, y1); ctx.stroke();
      if (dead) { ctx.strokeStyle = 'rgba(255,120,100,.6)'; ctx.beginPath(); ctx.moveTo(x1 - 4, y1 - 4); ctx.lineTo(x1 + 4, y1 + 4); ctx.moveTo(x1 + 4, y1 - 4); ctx.lineTo(x1 - 4, y1 + 4); ctx.stroke(); return; }
      tree(x1, y1, a - 0.35 - r() * 0.2, l * 0.78, d + 1); tree(x1, y1, a + 0.35 + r() * 0.2, l * 0.78, d + 1);
    };
    tree(400, 470, -Math.PI / 2, 95, 0);
    label(ctx, '多くの系統が途絶え、残った枝から新しい種が広がる', 400, 30, { size: 14, align: 'center' });
  } else if (it === 'cells') {
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#2a1a10'], [1, '#5a3418']]); ctx.fillRect(0, 0, W, H);
    // 真核生物(核を持つ細胞)に×
    ctx.fillStyle = 'rgba(200,220,160,.35)'; ctx.beginPath(); ctx.ellipse(230, 240, 120, 90, 0.2, 0, TAU); ctx.fill();
    disc(ctx, 220, 230, 36, 'rgba(140,100,200,.6)');
    ctx.strokeStyle = 'rgba(255,90,70,.9)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(120, 140); ctx.lineTo(340, 340); ctx.moveTo(340, 140); ctx.lineTo(120, 340); ctx.stroke();
    label(ctx, '真核生物', 230, 380, { size: 15, align: 'center' });
    const r = rng(3);
    for (let i = 0; i < 18; i++) { const x = 470 + r() * 280, y = 130 + r() * 230, a = r() * 3 + Math.sin(t + i) * 0.2; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = 'rgba(160,255,190,.7)'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 7, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    label(ctx, '原核生物だけが残る', 610, 400, { size: 15, align: 'center' });
  }
}

export function calendar(ctx, sc, env) {
  const t = env.t;
  ctx.fillStyle = '#10131c'; ctx.fillRect(0, 0, W, H);
  const page = (x, y, top, big, sub, col) => {
    ctx.fillStyle = '#f4efe4'; ctx.fillRect(x - 110, y - 120, 220, 250);
    ctx.fillStyle = col; ctx.fillRect(x - 110, y - 120, 220, 54);
    label(ctx, top, x, y - 93, { size: 17, align: 'center', color: '#fff', shadow: false });
    label(ctx, big, x, y + 10, { size: big.length > 6 ? 30 : 48, align: 'center', color: '#222', shadow: false, weight: 700 });
    label(ctx, sub, x, y + 90, { size: 14, align: 'center', color: '#555', shadow: false });
  };
  const m = sc.mode;
  if (m === 'drift') { page(250, 230, 'グレゴリオ暦', '3月20日', '暦の上の春分', '#3a6ab0'); page(550, 230, '実際の季節', '3月10日ごろ', '太陽が春分点に来る日', '#b05a3a'); label(ctx, '約10日のずれ', 400, 440, { size: 16, align: 'center', color: '#ffe08a' }); }
  if (m === 'hebrew') { page(250, 230, 'ユダヤ暦', '過越', 'いまは春の祭り', '#3a6ab0'); page(550, 230, '季節', '夏至', '北半球の夏至のころへずれる', '#b05a3a'); }
  if (m === 'hijri') { const k = (Math.sin(t * 0.5) + 1) / 2; page(250, 230, 'ヒジュラ暦', `${Math.round(lerp(1448, 20874, k)).toLocaleString()}年`, '月の満ち欠けで1年(約354日)', '#2a8a6a'); page(550, 230, 'グレゴリオ暦', `${Math.round(lerp(2026, 20874, k)).toLocaleString()}年`, '太陽で1年(約365日)', '#3a6ab0'); label(ctx, '短い1年で数えるヒジュラ暦が追いつく', 400, 440, { size: 16, align: 'center', color: '#ffe08a' }); }
  if (m === 'islamic') { page(250, 230, '計算で作った暦表', '1日', '新月の日(表の上)', '#2a8a6a'); page(550, 230, '実際の月', '11日', '本当の新月', '#6a5ab0'); label(ctx, '月の満ち欠けと約10日ずれる', 400, 440, { size: 16, align: 'center', color: '#ffe08a' }); }
  if (m === 'julian') { page(250, 230, 'ユリウス暦', '48,900年', '3月1日', '#8a6a3a'); page(550, 230, 'グレゴリオ暦', '48,901年', '3月1日', '#3a6ab0'); label(ctx, '1年あたり0.0075日の差が積もって、ちょうど1年', 400, 440, { size: 16, align: 'center', color: '#ffe08a' }); }
}
