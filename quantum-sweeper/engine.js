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

// 1つの成分を数える。cells: 成分のマス（盤上の番号）、cons: {cells, mask}
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
    const ps = k.cells.map(c => pos.get(c)).sort((a, b) => a - b);
    return { ps, mask: k.mask, first: ps[0], last: ps[ps.length - 1], size: ps.length };
  });
  // active[i]: 位置 i の直前で途中まで埋まっている制約（first < i <= last）
  const active = [];
  for (let i = 0; i <= n; i++) active.push([]);
  const cellCons = Array.from({ length: n }, () => []);
  C.forEach((k, ci) => {
    for (let i = k.first + 1; i <= k.last; i++) active[i].push(ci);
    for (const p of k.ps) cellCons[p].push(ci);
  });
  // remAfter[ci][i]: 位置 i を決めた後に残る制約 ci のマスの数
  const remAfter = C.map(k => {
    const r = new Int16Array(n);
    for (let i = 0; i < n; i++) r[i] = k.ps.filter(p => p > i).length;
    return r;
  });

  // 状態のキー: active[i] の順に各制約の地雷数を並べた文字列
  const F = [new Map([['', new Float64Array([1])]])];
  for (let i = 0; i < n; i++) {
    const next = new Map();
    const act = active[i], nact = active[i + 1];
    for (const [key, poly] of F[i]) {
      const sums = new Map();
      act.forEach((ci, j) => sums.set(ci, key.charCodeAt(j) - 48));
      for (let x = 0; x <= 1; x++) {
        const s2 = new Map(sums);
        let ok = true;
        for (const ci of cellCons[i]) {
          const v = (s2.get(ci) || 0) + x;
          s2.set(ci, v);
          const rem = remAfter[ci][i];
          // v .. v+rem の範囲に許される値が1つも無ければ打ち切る
          if (((C[ci].mask >> v) & ((1 << (rem + 1)) - 1)) === 0) { ok = false; break; }
        }
        if (!ok) continue;
        let nkey = '';
        for (const ci of nact) nkey += String.fromCharCode(48 + (s2.get(ci) || 0));
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
        const s2 = new Map(sums);
        let ok = true;
        for (const ci of cellCons[i]) {
          const v = (s2.get(ci) || 0) + x;
          s2.set(ci, v);
          if (((C[ci].mask >> v) & ((1 << (remAfter[ci][i] + 1)) - 1)) === 0) { ok = false; break; }
        }
        if (!ok) continue;
        let nkey = '';
        for (const ci of nact) nkey += String.fromCharCode(48 + (s2.get(ci) || 0));
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
// 戻り値: { omega, prob: Float64Array（未開放マスの地雷確率。開いたマスは 0） }
export function analyze(W, H, M, opened, clues, needProbs = true) {
  const N = W * H;
  const prob = new Float64Array(N);
  const cons = [];
  for (const [c, mask] of clues) {
    const cells = neighbors(c, W, H).filter(d => !opened[d]);
    if (!cells.length) {
      if (!(mask & 1)) return { omega: 0, prob };
      continue;
    }
    cons.push({ cells, mask: mask & ((1 << (cells.length + 1)) - 1) });
  }
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

// 検出器の種類ごとに、周囲の地雷数 0..8 を「表示される手がかり」へ分ける。
// 同じ表示になる地雷数の集合は配置によらず決まっているので、世界の重みは均等のまま保たれる。
export const DETECTORS = {
  exact: { label: '精密', classes: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => [n]) },
  range: { label: '幅', classes: [[0, 1], [2, 3], [4, 5], [6, 7], [8]] },
  pair: { label: '二重', classes: [[0, 2], [1, 3], [4, 6], [5, 7], [8]] },
  parity: { label: '偶奇', classes: [[0, 2, 4, 6, 8], [1, 3, 5, 7]] },
};
export function classLabel(type, cls) {
  if (type === 'parity') return cls[0] === 0 ? '偶' : '奇';
  if (cls.length === 1) return cls[0] === 0 ? '' : String(cls[0]);
  return type === 'range' ? `${cls[0]}-${cls[1]}` : `${cls[0]}|${cls[1]}`;
}
export const maskOf = cls => cls.reduce((m, n) => m | (1 << n), 0);
