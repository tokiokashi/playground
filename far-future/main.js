import { W, H, TAU, clamp, lerp, smooth, rng, setTextScale } from './util.js';
import { EVENTS, CATS, ERAS, buildStops } from './events.js';
import { ground, globe, planet } from './earth.js';
import { solar, galaxy, star, degen, blackholes, dark, probe, polesky, transit, orbit } from './space.js';
import { artifact, strata, nuclear, human, bio, calendar } from './misc.js';

const VIEWS = { ground, globe, planet, solar, galaxy, star, degen, bh: blackholes, dark, probe, polesky, transit, orbit, artifact, strata, nuclear, human, bio, calendar };
const STOPS = buildStops(EVENTS);
const N = STOPS.length;
const $ = id => document.getElementById(id);

// ---------- 年数の表し方 ----------
const UNITS = ['', '万', '億', '兆', '京', '垓', '𥝱', '穣', '溝', '澗', '正', '載', '極', '恒河沙', '阿僧祇', '那由他', '不可思議', '無量大数'];
const SUP = s => String(s).replace(/[0-9-]/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] ?? '⁻');
function jaNumber(L) {
  if (L < 4) return Math.round(10 ** L).toLocaleString('ja-JP');
  const k = Math.min(17, Math.floor(L / 4));
  let mant = 10 ** (L - 4 * k), major = Math.floor(mant), minor = Math.round((mant - major) * 100) * 100;
  if (minor >= 10000) { major += 1; minor = 0; }
  return `${major}${UNITS[k]}${minor ? minor + UNITS[k - 1] : ''}`;
}
function sci(L) {
  const e = Math.floor(L + 1e-9), m = 10 ** (L - e);
  const ms = m.toFixed(m < 9.95 ? 1 : 0);
  return ms === '1.0' ? `10<sup>${e}</sup>` : `${ms} × 10<sup>${e}</sup>`;
}
function readout(L, stop) {
  if (stop?.tower) return { main: `${stop.tower}`, unit: '年後', sub: stop.towerNote };
  if (L < 0.5) return { main: '現在', unit: '', sub: `西暦${2026}年` };
  if (L < 72) {
    const sub = L < 6.2 ? `西暦${Math.round(2026 + 10 ** L).toLocaleString('ja-JP')}年ごろ` : `${sci(L)} 年`;
    return { main: jaNumber(L), unit: '年後', sub };
  }
  return { main: sci(L), unit: '年後', sub: '漢数字の単位(無量大数)では書けない' };
}
const eraOf = L => [...ERAS].reverse().find(([from]) => L >= from);

// ---------- 状態 ----------
const state = {
  pos: 0, tween: null, dragging: false, auto: false, autoNext: 0,
  pick: new Map(), // 停留点ごとに選んだ出来事
  cats: new Set(Object.keys(CATS)),
  fade: null, // 出来事を切り替えた時の前の絵 { ev, t0 }
};
const visibleEvents = stop => stop.events.filter(e => state.cats.has(e.cat));
const pickedEvent = i => {
  const stop = STOPS[i], vis = visibleEvents(stop);
  const p = state.pick.get(i);
  return (p && vis.includes(p)) ? p : (vis[0] || stop.events[0]);
};

// ---------- 描画 ----------
const canvas = $('view');
const ctx = canvas.getContext('2d');
const off = [document.createElement('canvas'), document.createElement('canvas')];
let scale = 1;
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.round(w * H / W);
  for (const c of [canvas, ...off]) { c.width = w; c.height = h; }
  scale = w / W;
  setTextScale(clamp(0.8 * W / Math.max(1, canvas.clientWidth), 1, 2));
}
new ResizeObserver(resize).observe(canvas);
resize();

function paint(c, ev, env) {
  const g = c.getContext('2d');
  g.setTransform(scale, 0, 0, scale, 0, 0);
  g.globalAlpha = 1;
  const sc = ev.s;
  const e = sc.at ? { ...env, L: Math.log10(sc.at), years: sc.at } : env;
  try { VIEWS[sc.v](g, sc, e); } catch (err) { console.error(err); }
}

// 時間を跳ぶ時の光の筋
const streaks = (() => { const r = rng(99); return Array.from({ length: 110 }, () => [r() * TAU, r(), 0.4 + r() * 0.6]); })();
function warp(g, k, t, dir) {
  if (k <= 0.01) return;
  g.save();
  g.fillStyle = `rgba(8,14,40,${0.45 * k})`; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  for (const [a, r0, s] of streaks) {
    const p = ((r0 + t * 1.4 * s * dir) % 1 + 1) % 1;
    const d0 = 30 + p * 520, d1 = d0 + 40 + 160 * k * s;
    const c = Math.cos(a), sn = Math.sin(a);
    g.strokeStyle = `rgba(${150 + 100 * s | 0},${200 + 40 * s | 0},255,${0.55 * k * p})`;
    g.lineWidth = 1 + s * 1.5;
    g.beginPath(); g.moveTo(400 + c * d0, 250 + sn * d0 * 0.7); g.lineTo(400 + c * d1, 250 + sn * d1 * 0.7); g.stroke();
  }
  const gr = g.createRadialGradient(400, 250, 0, 400, 250, 120);
  gr.addColorStop(0, `rgba(255,236,200,${0.5 * k})`); gr.addColorStop(1, 'rgba(255,236,200,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.restore();
}

function render(now) {
  const t = now / 1000;
  const pos = state.pos;
  const i = Math.min(N - 1, Math.floor(pos + 1e-6)), f = clamp(pos - i);
  const A = STOPS[i], B = STOPS[Math.min(N - 1, i + 1)];
  const L = lerp(A.L, B.L, f);
  const env = { L, years: L > 300 ? Infinity : 10 ** L, t };
  const evA = pickedEvent(i), evB = pickedEvent(Math.min(N - 1, i + 1));
  const mixB = f > 0.001 ? smooth(0.25, 0.75, f) : 0;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  paint(off[0], evA, env);
  ctx.drawImage(off[0], 0, 0);
  if (mixB > 0) { paint(off[1], evB, env); ctx.globalAlpha = mixB; ctx.drawImage(off[1], 0, 0); ctx.globalAlpha = 1; }
  if (state.fade && f < 0.001) {
    const k = 1 - (now - state.fade.t0) / 450;
    if (k <= 0) state.fade = null;
    else { paint(off[1], state.fade.ev, env); ctx.globalAlpha = k; ctx.drawImage(off[1], 0, 0); ctx.globalAlpha = 1; }
  }
  const moving = state.tween || state.dragging;
  const wk = moving ? Math.sin(Math.PI * f) * (state.tween ? 1 : 0.7) : 0;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  warp(ctx, wk, t, state.tween && state.tween.to < state.tween.from ? -1 : 1);
  updateReadout(L, f < 0.001 ? A : (f > 0.999 ? B : null), f < 0.5 ? A : B, mixB > 0.5 ? evB : evA);
}

// ---------- 表示の更新 ----------
let lastReadout = '', lastList = -1, lastEra = '';
function updateReadout(L, exactStop, nearStop, ev) {
  const r = readout(L, exactStop || (nearStop.tower ? nearStop : null));
  const html = `<span class="num">${r.main}</span>${r.unit ? `<span class="unit">${r.unit}</span>` : ''}`;
  const key = html + r.sub;
  if (key !== lastReadout) { $('years').innerHTML = html; $('sub').innerHTML = r.sub; lastReadout = key; }
  const era = eraOf(L);
  if (era[1] !== lastEra) { $('era').innerHTML = `<b>${era[1]}</b><span>${era[2]}</span>`; lastEra = era[1]; }
  const badge = ev ? `${CATS[ev.cat][1]} ${ev.title}` : '';
  if ($('badge').textContent !== badge) { $('badge').textContent = badge; canvas.setAttribute('aria-label', ev ? `想像図: ${ev.title}` : '想像図'); }
  const xp = state.pos / (N - 1) * 100;
  $('thumb').style.left = xp + '%';
}

function stopLabel(stop) {
  const e = stop.events.find(e => e.when);
  if (e) return e.when;
  if (stop.tower) return stop.tower + '年後';
  const r = readout(stop.L, stop);
  return stop.L < 0.5 ? '西暦2026年' : `${r.main}年後`;
}

function renderList() {
  const i = Math.round(state.pos);
  const stop = STOPS[i];
  const vis = visibleEvents(stop);
  const cur = pickedEvent(i);
  const ol = $('events');
  ol.innerHTML = '';
  if (!vis.length) {
    const li = document.createElement('li'); li.className = 'empty';
    li.textContent = 'この時刻の出来事は、分野の絞り込みで隠れている。';
    ol.append(li);
  }
  for (const ev of vis) {
    const [name, icon, col] = CATS[ev.cat];
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-current', ev === cur ? 'true' : 'false');
    b.innerHTML = `<span class="ev-head"><span class="chip" style="--c:${col}">${icon} ${name}</span><span>${ev.when || stopLabel(stop)}</span>${ev.prob ? '<span class="prob">時期は不確か</span>' : ''}</span>`
      + `<span class="ev-title"></span><span class="ev-text"></span>`;
    b.querySelector('.ev-title').textContent = ev.title;
    b.querySelector('.ev-text').textContent = ev.text;
    b.addEventListener('click', () => {
      const prev = pickedEvent(i);
      if (prev === ev) return;
      state.fade = { ev: prev, t0: performance.now() };
      state.pick.set(i, ev);
      for (const x of ol.querySelectorAll('button')) x.setAttribute('aria-current', 'false');
      b.setAttribute('aria-current', 'true');
    });
    li.append(b); ol.append(li);
  }
  $('count').textContent = `${i + 1} / ${N} 地点`;
  $('next').disabled = i === N - 1;
  $('prev').disabled = i === 0;
  $('pos').innerHTML = stopLabel(stop);
  const track = $('track');
  track.setAttribute('aria-valuemax', String(N - 1));
  track.setAttribute('aria-valuenow', String(i));
  track.setAttribute('aria-valuetext', stopLabel(stop));
  for (const [k, tk] of ticks.entries()) tk.className = k === i ? 'on' : '';
  lastList = i;
  try { history.replaceState(null, '', i ? `#${i}` : location.pathname + location.search); } catch {}
}

// ---------- 目盛り ----------
const ERA_COL = ['#c98a2a', '#6a4ab0', '#7a1a2a', '#2a2e3e'];
const ticks = [];
(function buildTrack() {
  const bar = $('bar'), tk = $('ticks'), marks = $('marks');
  let run = null;
  STOPS.forEach((s, k) => {
    const ei = ERAS.indexOf(eraOf(s.L));
    if (!run || run.ei !== ei) { run = { ei, el: document.createElement('i') }; run.el.style.background = ERA_COL[ei]; run.n = 0; bar.append(run.el); }
    run.n++; run.el.style.flex = String(run.n);
    const t = document.createElement('i'); t.style.left = (k / (N - 1) * 100) + '%'; tk.append(t); ticks.push(t);
  });
  // 目盛りは出来事の順に等間隔なので、桁の目印は出来事の多い前半に寄る
  const want = [[4, '1万年'], [5, '10万'], [6, '100万', 1], [8, '1億'], [10, '100億'], [12, '1兆', 1], [20, '10²⁰'], [100, '10¹⁰⁰', 1]];
  for (const [L, txt, wide] of want) {
    const k = STOPS.findIndex(s => s.L >= L - 1e-9);
    const span = document.createElement('span');
    span.style.left = (k / (N - 1) * 100) + '%';
    span.innerHTML = txt;
    if (wide) span.className = 'wide';
    marks.append(span);
  }
})();

// ---------- 移動 ----------
const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
function travel(to, dur) {
  to = clamp(Math.round(to), 0, N - 1);
  const dist = Math.abs(to - state.pos);
  if (dist < 1e-6) { state.pos = to; renderList(); return; }
  state.tween = { from: state.pos, to, t0: performance.now(), dur: dur ?? Math.min(2400, 900 + dist * 60) };
}
function step(dir) {
  let k = Math.round(state.tween ? state.tween.to : state.pos);
  do { k += dir; } while (k > 0 && k < N - 1 && !visibleEvents(STOPS[k]).length);
  if (k < 0 || k > N - 1) return false;
  travel(k);
  return true;
}
$('next').addEventListener('click', () => step(1));
$('prev').addEventListener('click', () => step(-1));
$('home').addEventListener('click', () => { setAuto(false); travel(0, 1600); });
function setAuto(on) {
  state.auto = on;
  $('auto').setAttribute('aria-pressed', String(on));
  $('auto').textContent = on ? '停止' : '自動航行';
  state.autoNext = performance.now() + 600;
}
$('auto').addEventListener('click', () => setAuto(!state.auto));
document.addEventListener('keydown', e => {
  if (e.target.closest('input,textarea')) return;
  if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
});

const track = $('track');
const posFromEvent = e => { const r = track.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width) * (N - 1); };
track.addEventListener('pointerdown', e => {
  track.setPointerCapture(e.pointerId);
  state.dragging = true; state.tween = null; setAuto(false);
  state.pos = posFromEvent(e);
});
track.addEventListener('pointermove', e => { if (state.dragging) state.pos = posFromEvent(e); });
const endDrag = () => { if (!state.dragging) return; state.dragging = false; travel(Math.round(state.pos), 350); };
track.addEventListener('pointerup', endDrag);
track.addEventListener('pointercancel', endDrag);

// 分野の絞り込み
for (const [k, [name, icon, col]] of Object.entries(CATS)) {
  const b = document.createElement('button');
  b.type = 'button'; b.style.setProperty('--c', col);
  b.setAttribute('aria-pressed', 'true');
  b.innerHTML = `<span>${icon}</span>${name}`;
  b.addEventListener('click', () => {
    const on = !state.cats.has(k);
    if (on) state.cats.add(k); else if (state.cats.size > 1) state.cats.delete(k); else return;
    b.setAttribute('aria-pressed', String(on));
    renderList();
  });
  $('cats').append(b);
}

// ---------- ループ ----------
function frame(now) {
  if (state.tween) {
    const { from, to, t0, dur } = state.tween;
    const k = clamp((now - t0) / dur);
    state.pos = lerp(from, to, ease(k));
    if (k >= 1) { state.pos = to; state.tween = null; renderList(); }
  }
  if (state.auto && !state.tween && !state.dragging && now > state.autoNext) {
    if (!step(1)) setAuto(false);
    state.autoNext = now + 5200;
  }
  const r = Math.round(state.pos);
  if (r !== lastList && !state.tween) renderList();
  render(now);
  requestAnimationFrame(frame);
}

const start = parseInt(location.hash.slice(1), 10);
if (start > 0 && start < N) state.pos = start;
renderList();
requestAnimationFrame(frame);
