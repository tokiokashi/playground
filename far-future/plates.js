// 大陸移動のおおまかなモデル。現在の陸地の輪郭をプレートごとに球面上で回す。
// 行き先は Scotese のパンゲア・プロキシマ(2億5000万年後)の配置を目で合わせたもので、計算ではない。
import { PLATES } from './geo.js';
import { clamp } from './util.js';

const D = Math.PI / 180;
export const vec = (lat, lon) => [Math.cos(lat * D) * Math.cos(lon * D), Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D)];
const toLL = v => [Math.asin(clamp(v[2], -1, 1)) / D, Math.atan2(v[1], v[0]) / D];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = v => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

// 回転は [軸(単位ベクトル), 角度] で持ち、合成はクォータニオンで行う
const qAxis = (ax, a) => { const s = Math.sin(a / 2); return [Math.cos(a / 2), ax[0] * s, ax[1] * s, ax[2] * s]; };
const qMul = (a, b) => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];
const qPow = (q, p) => {
  const a = 2 * Math.acos(clamp(q[0], -1, 1));
  const s = Math.sqrt(Math.max(0, 1 - q[0] * q[0]));
  if (s < 1e-9) return [1, 0, 0, 0];
  return qAxis([q[1] / s, q[2] / s, q[3] / s], a * p);
};
export function qRot(q, v) {
  const [w, x, y, z] = q;
  const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}

// 段階: どのプレートを、いつからいつまでに、基準プレートの重心をどれだけ動かし、どれだけ回すか
const STAGES = [
  { plates: ['SOM'], ref: 'SOM', y: [0, 1e7], dLat: -0.5, dLon: 3.2, spin: -4 },            // 大地溝帯が開く
  { plates: ['AF', 'SOM'], ref: 'AF', y: [0, 5e7], dLat: 7, dLon: 3, spin: 9 },              // アフリカが北上して地中海を閉じる
  { plates: ['AF', 'SOM'], ref: 'AF', y: [5e7, 2.5e8], dLat: 4, dLon: 2, spin: 6 },
  { plates: ['AU'], ref: 'AU', y: [0, 1.6e8], to: [-8, 116], spin: -22 },                // オーストラリアが東南アジアへ
  { plates: ['NA'], ref: 'NA', y: [0, 1.25e8], dLat: 0, dLon: -7, spin: -2 },                // 大西洋はしばらく広がる
  { plates: ['SA'], ref: 'SA', y: [0, 1.25e8], dLat: 0, dLon: -6, spin: 0 },
  { plates: ['NA'], ref: 'NA', y: [1.25e8, 2.5e8], to: [36, -46], spin: -6 },         // 大西洋が閉じ、北米がアフリカへ
  { plates: ['SA'], ref: 'SA', y: [1.25e8, 2.5e8], to: [-36, 11], spin: 100 },          // 南米がアフリカの南端を回り込む
  { plates: ['AN'], ref: 'AN', y: [5e7, 2.5e8], to: [-36, 77], spin: 30 },              // 南極が北上してマダガスカル・豪州とぶつかる
  // 4億〜6億年後: 超大陸の分裂
  { plates: ['NA', 'SA'], ref: 'NA', y: [3.8e8, 6.5e8], dLat: 6, dLon: -30, spin: -10 },
  { plates: ['AU', 'AN'], ref: 'AU', y: [3.8e8, 6.5e8], dLat: -14, dLon: 30, spin: 15 },
  { plates: ['AF', 'SOM'], ref: 'AF', y: [3.8e8, 6.5e8], dLat: -10, dLon: -4, spin: -6 },
];

const P = {};
for (const [k, rings] of Object.entries(PLATES)) {
  const pts = rings.map(r => { const a = []; for (let i = 0; i < r.length; i += 2) a.push(vec(r[i + 1], r[i])); return a; });
  let c = [0, 0, 0];
  for (const r of pts) for (const v of r) { c[0] += v[0]; c[1] += v[1]; c[2] += v[2]; }
  P[k] = { rings: pts, c: norm(c), q: [1, 0, 0, 0] };
}

// 各段階の回転を、それより前の段階が終わった時点の重心から決める
for (const s of STAGES) {
  const ref = P[s.ref];
  const c = qRot(ref.q, ref.c);
  const [lat, lon] = toLL(c);
  const t = s.to ? vec(...s.to) : vec(lat + s.dLat, lon + s.dLon);
  const ang = Math.acos(clamp(dot(c, t), -1, 1));
  const qm = ang > 1e-9 ? qAxis(norm(cross(c, t)), ang) : [1, 0, 0, 0];
  s.q = qMul(qAxis(t, s.spin * D), qm);
  for (const k of s.plates) P[k].q = qMul(s.q, P[k].q);
}

export const PLATE_KEYS = Object.keys(P);

// years 年後の各プレートの回転
export function plateRotations(years) {
  const out = {};
  for (const k of PLATE_KEYS) out[k] = [1, 0, 0, 0];
  for (const s of STAGES) {
    const p = clamp((years - s.y[0]) / (s.y[1] - s.y[0]));
    if (p <= 0) continue;
    const qs = qPow(s.q, p);
    for (const k of s.plates) out[k] = qMul(qs, out[k]);
  }
  return out;
}

export const plateRings = k => P[k].rings;
export const plateCenter = k => P[k].c;
