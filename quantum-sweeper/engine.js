// 確率エンジン。地雷の配置は持たず、開いたマスの手がかりと矛盾しない配置（世界）を数える。
// 世界はどれも同じ重みとし、Ω は手がかりと地雷の総数に矛盾しない配置の数。
//
// 未開放のマスを、手がかりに接するもの（境界）と接しないもの（残り r 個）に分ける。
// 境界は手がかりで連結な成分に分け、成分ごとに前向き・後ろ向きの DP で
// 「地雷 k 個の解の数」と「各マスが地雷である解の数」を k ごとに数える。
// 残り r 個は地雷が何個でも区別がないので、二項係数 C(r, M − k) でまとめる。

const binomCache = [];
export function binom(n, k) {
  if (k < 0 || k > n) return 0;
  while (binomCache.length <= n) {
    const m = binomCache.length, row = new Float64Array(m + 1);
    row[0] = row[m] = 1;
    for (let j = 1; j < m; j++) row[j] = binomCache[m - 1][j - 1] + binomCache[m - 1][j];
    binomCache.push(row);
  }
  return binomCache[n][k];
}

function conv(a, b) {
  const out = new Float64Array(a.length + b.length - 1);
  for (let i = 0; i < a.length; i++) if (a[i]) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return out;
}
function addInto(map, key, poly, shift) {
  let cur = map.get(key);
  const need = poly.length + shift;
  if (!cur || cur.length < need) {
    const grown = new Float64Array(need);
    if (cur) grown.set(cur);
    cur = grown;
    map.set(key, cur);
  }
  for (let i = 0; i < poly.length; i++) cur[i + shift] += poly[i];
}

// 1つの成分を数える。cells: 成分のマス（盤上の番号）、cons: {cells, w, off, mask}
// 制約の値は off + Σ w·x（w は各マスの重み ±1、x は地雷なら 1）。mask の bit v が立っていれば値 v を許す
// 戻り値: poly[k] = 地雷 k 個の解の数、mine[i][k] = cells[i] が地雷で地雷 k 個の解の数
function solveComponent(cells, cons, W, needMarginals) {
  // 状態に乗る制約の数を減らすため、短い方の辺に沿って並べる
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
  for (const c of cells) {
    const x = c % W, y = (c / W) | 0;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const byRow = maxX - minX <= maxY - minY;
  const order = cells.slice().sort((a, b) => {
    const ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0;
    return byRow ? ay - by || ax - bx : ax - bx || ay - by;
  });
  const n = order.length;
  const pos = new Map(order.map((c, i) => [c, i]));
  const C = cons.map(k => {
    const pw = k.cells.map((c, j) => [pos.get(c), k.w ? k.w[j] : 1]).sort((a, b) => a[0] - b[0]);
    const ps = pw.map(x => x[0]);
    return { ps, wt: new Map(pw), mask: k.mask, off: k.off || 0, first: ps[0], last: ps[ps.length - 1], size: ps.length };
  });
  // active[i]: 位置 i の直前で途中まで埋まっている制約（first < i <= last）
  const active = [];
  for (let i = 0; i <= n; i++) active.push([]);
  const cellCons = Array.from({ length: n }, () => []);
  C.forEach((k, ci) => {
    for (let i = k.first + 1; i <= k.last; i++) active[i].push(ci);
    for (const p of k.ps) cellCons[p].push(ci);
  });
  // 位置 i を決めた後に残る制約 ci のマスのうち、重み +1 のもの（posAfter）と −1 のもの（negAfter）の数
  const posAfter = C.map(k => {
    const r = new Int16Array(n);
    for (let i = 0; i < n; i++) r[i] = k.ps.filter(p => p > i && k.wt.get(p) > 0).length;
    return r;
  });
  const negAfter = C.map(k => {
    const r = new Int16Array(n);
    for (let i = 0; i < n; i++) r[i] = k.ps.filter(p => p > i && k.wt.get(p) < 0).length;
    return r;
  });
  // 位置 i のマスを x にした後の値 v から、残りのマスで届く範囲 v − neg .. v + pos に許される値が無ければ打ち切る
  const step = (sums, i, x) => {
    const s2 = new Map(sums);
    for (const ci of cellCons[i]) {
      const v = (s2.has(ci) ? s2.get(ci) : C[ci].off) + x * C[ci].wt.get(i);
      s2.set(ci, v);
      const lo = v - negAfter[ci][i], span = negAfter[ci][i] + posAfter[ci][i];
      if (((C[ci].mask >> lo) & ((1 << (span + 1)) - 1)) === 0) return null;
    }
    return s2;
  };

  // 状態のキー: active[i] の順に各制約の地雷数を並べた文字列
  const F = [new Map([['', new Float64Array([1])]])];
  for (let i = 0; i < n; i++) {
    const next = new Map();
    const act = active[i], nact = active[i + 1];
    for (const [key, poly] of F[i]) {
      const sums = new Map();
      act.forEach((ci, j) => sums.set(ci, key.charCodeAt(j) - 48));
      for (let x = 0; x <= 1; x++) {
        const s2 = step(sums, i, x);
        if (!s2) continue;
        let nkey = '';
        for (const ci of nact) nkey += String.fromCharCode(48 + s2.get(ci));
        addInto(next, nkey, poly, x);
      }
    }
    F.push(next);
  }
  const poly = F[n].get('') || new Float64Array(1);
  if (!needMarginals) return { order, poly, mine: null };

  // 後ろ向き: B[i][key] = 位置 i 以降の埋め方の数（地雷数ごと）
  const B = new Array(n + 1);
  B[n] = new Map([['', new Float64Array([1])]]);
  const mine = Array.from({ length: n }, () => new Float64Array(n + 1));
  for (let i = n - 1; i >= 0; i--) {
    const cur = new Map();
    const act = active[i], nact = active[i + 1];
    for (const [key, fpoly] of F[i]) {
      const sums = new Map();
      act.forEach((ci, j) => sums.set(ci, key.charCodeAt(j) - 48));
      for (let x = 0; x <= 1; x++) {
        const s2 = step(sums, i, x);
        if (!s2) continue;
        let nkey = '';
        for (const ci of nact) nkey += String.fromCharCode(48 + s2.get(ci));
        const bpoly = B[i + 1].get(nkey);
        if (!bpoly) continue;
        addInto(cur, key, bpoly, x);
        if (x === 1) {
          const c = conv(fpoly, bpoly);
          for (let k = 0; k < c.length && k + 1 <= n; k++) mine[i][k + 1] += c[k];
        }
      }
    }
    B[i] = cur;
  }
  return { order, poly, mine };
}

// 盤を解析する。
//   W, H, M: 盤の幅・高さ・地雷の総数
//   opened: Uint8Array（1 = 開いた。開いたマスに地雷は無い）
//   clues: Map<マス, mask>（mask の bit n が立っていれば「周囲の地雷が n 個」を許す）
//   needProbs: false なら Ω だけ求める
//   mines: 地雷に賭けて確定させたマスの集合（そのマスに地雷がある世界だけを数える）
//   area: マス c の検出器が見る範囲 { cells, w, off }（DETECTORS の area と同じ形）。省略すると周りの8マスを数える
// 戻り値: { omega, prob: Float64Array（未開放マスの地雷確率。開いたマスは 0） }
export function analyze(W, H, M, opened, clues, needProbs = true, mines = null, area = null) {
  const N = W * H;
  const prob = new Float64Array(N);
  const cons = [];
  for (const [c, mask] of clues) {
    const a = area ? area(c) : { cells: neighbors(c, W, H), w: null, off: 0 };
    const cells = [], w = [];
    let pos = 0, neg = 0;
    a.cells.forEach((d, j) => {
      if (opened[d]) return;
      const wt = a.w ? a.w[j] : 1;
      cells.push(d); w.push(wt);
      if (wt > 0) pos++; else neg++;
    });
    // 開いたマスに地雷は無いので、値は off − neg .. off + pos の範囲に収まる
    const m = mask & (((1 << (neg + pos + 1)) - 1) << (a.off - neg));
    if (!m) return { omega: 0, prob };
    if (!cells.length) continue;
    cons.push({ cells, w, off: a.off, mask: m });
  }
  if (mines) for (const c of mines) cons.push({ cells: [c], mask: 0b10 });
  if (cons.some(k => !k.mask)) return { omega: 0, prob };

  // 境界のマスを制約でつないで成分に分ける
  const parent = new Map();
  const find = a => { while (parent.get(a) !== a) { parent.set(a, parent.get(parent.get(a))); a = parent.get(a); } return a; };
  for (const k of cons) for (const c of k.cells) if (!parent.has(c)) parent.set(c, c);
  for (const k of cons) for (let i = 1; i < k.cells.length; i++) {
    const a = find(k.cells[0]), b = find(k.cells[i]);
    if (a !== b) parent.set(a, b);
  }
  const groups = new Map();
  for (const c of parent.keys()) {
    const r = find(c);
    if (!groups.has(r)) groups.set(r, { cells: [], cons: [] });
    groups.get(r).cells.push(c);
  }
  for (const k of cons) groups.get(find(k.cells[0])).cons.push(k);
  const comps = [...groups.values()].map(g => solveComponent(g.cells, g.cons, W, needProbs));

  let unknown = 0;
  for (let i = 0; i < N; i++) if (!opened[i]) unknown++;
  const r = unknown - parent.size;

  // 成分ごとに「自分以外の成分の積」を前後の累積から作る
  const m = comps.length;
  const pre = [new Float64Array([1])], suf = new Array(m + 1);
  for (let j = 0; j < m; j++) pre.push(conv(pre[j], comps[j].poly));
  suf[m] = new Float64Array([1]);
  for (let j = m - 1; j >= 0; j--) suf[j] = conv(comps[j].poly, suf[j + 1]);
  const total = pre[m];
  let omega = 0;
  for (let k = 0; k < total.length; k++) omega += total[k] * binom(r, M - k);
  if (!needProbs || omega === 0) return { omega, prob };

  for (let j = 0; j < m; j++) {
    const others = conv(pre[j], suf[j + 1]);
    const comp = comps[j];
    // G[kj] = Σ_K others[K]·C(r, M − kj − K)
    const G = new Float64Array(comp.poly.length);
    for (let kj = 0; kj < G.length; kj++) {
      let s = 0;
      for (let K = 0; K < others.length; K++) if (others[K]) s += others[K] * binom(r, M - kj - K);
      G[kj] = s;
    }
    comp.order.forEach((c, i) => {
      let s = 0;
      for (let k = 0; k < G.length; k++) s += comp.mine[i][k] * G[k];
      prob[c] = s / omega;
    });
  }
  if (r > 0) {
    let s = 0;
    for (let k = 0; k < total.length; k++) if (M - k > 0) s += total[k] * binom(r, M - k) * (M - k) / r;
    const pr = s / omega;
    for (let i = 0; i < N; i++) if (!opened[i] && !parent.has(i)) prob[i] = pr;
  }
  return { omega, prob };
}

export function neighbors(c, W, H) {
  const x = c % W, y = (c / W) | 0, out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < W && ny < H) out.push(ny * W + nx);
  }
  return out;
}

// 検出器の範囲。マス c から見た相対位置 [dx, dy] と重み（省略すると +1）
const KING = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const CROSS = [[0, -1], [-1, 0], [1, 0], [0, 1]];
const DIAG = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const KNIGHT = [[-1, -2], [1, -2], [-2, -1], [2, -1], [-2, 1], [2, 1], [-1, 2], [1, 2]];
// 比べる検出器: 左の列から右の列を引いた値（⇆）、上の行から下の行を引いた値（⇅）
const LR = [[-1, -1, 1], [-1, 0, 1], [-1, 1, 1], [1, -1, -1], [1, 0, -1], [1, 1, -1]];
const UD = [[-1, -1, 1], [0, -1, 1], [1, -1, 1], [-1, 1, -1], [0, 1, -1], [1, 1, -1]];
function shape(offsets) {
  const off = offsets.filter(o => o[2] < 0).length;
  return (c, W, H) => {
    const x = c % W, y = (c / W) | 0, cells = [], w = [];
    for (const [dx, dy, wt = 1] of offsets) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) { cells.push(ny * W + nx); w.push(wt); }
    }
    return { cells, w, off };
  };
}
const single = n => Array.from({ length: n + 1 }, (_, k) => [k]);
const countLabel = cls => cls.length === 1 ? (cls[0] === 0 ? '' : String(cls[0])) : `${cls[0]}-${cls[cls.length - 1]}`;

// 検出器の種類ごとに、範囲の値を「表示される手がかり」へ分ける。
//   area: 見る範囲。count が true の種類は範囲の地雷の数を数え、0 と確定すると範囲のマスが続けて開く
//   parts: 値の分け方。複数ある種類は、区切りの位置が違う分け方のどれかを、マスごとにくじで最初に決める。
//   どの分け方でも取りうる値はちょうど1つの組に入るので、本当の値によらず
//   同じ表示が出る確率がそろい、世界の重みは均等のまま保たれる
//   show: 開いた後も印を残す種類（表示が普通の数字と見分けられないもの）
export const DETECTORS = {
  exact: { area: shape(KING), count: true, parts: [single(8)], fmt: countLabel },
  range: { area: shape(KING), count: true, parts: [[[0, 1], [2, 3], [4, 5], [6, 7], [8]], [[0], [1, 2], [3, 4], [5, 6], [7, 8]]], fmt: countLabel },
  pair: { area: shape(KING), count: true, parts: [[[0, 2], [1, 3], [4, 6], [5, 7], [8]], [[0], [1, 3], [2, 4], [5, 7], [6, 8]]], fmt: cls => cls.length === 1 ? countLabel(cls) : `${cls[0]}|${cls[1]}` },
  parity: { area: shape(KING), count: true, parts: [[[0, 2, 4, 6, 8], [1, 3, 5, 7]]], fmt: cls => cls[0] === 0 ? '偶' : '奇' },
  wide: { area: shape(KING), count: true, parts: [[[0, 1, 2], [3, 4, 5], [6, 7, 8]], [[0], [1, 2, 3], [4, 5, 6], [7, 8]], [[0, 1], [2, 3, 4], [5, 6, 7], [8]]], fmt: countLabel },
  cross: { area: shape(CROSS), count: true, show: true, parts: [single(4)], fmt: countLabel },
  diag: { area: shape(DIAG), count: true, show: true, parts: [single(4)], fmt: countLabel },
  knight: { area: shape(KNIGHT), count: true, show: true, parts: [single(8)], fmt: countLabel },
  // 値は（左 − 右）または（上 − 下）。多い側を矢印で、同数を「=」で答える
  lr: { area: shape(LR), show: true, parts: [[[1, 2, 3], [0], [-3, -2, -1]]], fmt: cls => cls[0] > 0 ? '←' : cls[0] < 0 ? '→' : '=' },
  ud: { area: shape(UD), show: true, parts: [[[1, 2, 3], [0], [-3, -2, -1]]], fmt: cls => cls[0] > 0 ? '↑' : cls[0] < 0 ? '↓' : '=' },
};
export function classLabel(type, cls) {
  return DETECTORS[type].fmt(cls);
}
// 値の組を mask にする。値 v は off だけずらした bit v + off に置く
export const maskOf = (cls, off = 0) => cls.reduce((m, n) => m | (1 << (n + off)), 0);
