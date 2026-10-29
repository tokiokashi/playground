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

// 並べ方 order での状態の数の見積もり: 各位置で途中になっている制約について（マスの数 + 1）を掛けた積の和
function orderCost(order, cons) {
  const pos = new Map(order.map((c, i) => [c, i]));
  const delta = new Float64Array(order.length + 1);
  for (const k of cons) {
    let a = Infinity, b = -1;
    for (const c of k.cells) { const p = pos.get(c); if (p < a) a = p; if (p > b) b = p; }
    const l = Math.log(k.cells.length + 1);
    delta[a + 1] += l;
    delta[b + 1] -= l;
  }
  let cost = 0, cur = 0;
  for (let i = 0; i <= order.length; i++) { cur += delta[i]; cost += Math.exp(cur); }
  return cost;
}
function pickOrder(cells, cons, W) {
  const xy = c => [c % W, (c / W) | 0];
  const byRow = cells.slice().sort((a, b) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return ay - by || ax - bx; });
  const byCol = cells.slice().sort((a, b) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return ax - bx || ay - by; });
  const cands = [byRow, byCol];
  if (cells.length > 12) {
    // 貪欲: 置くと新しく始まる制約の数 − 終わる制約の数 が一番小さいマスを、置いたマスに制約でつながるものから選ぶ
    const consOf = new Map(cells.map(c => [c, []]));
    cons.forEach((k, ci) => { for (const c of k.cells) consOf.get(c).push(ci); });
    const left = cons.map(k => k.cells.length), started = new Uint8Array(cons.length);
    const placed = new Set(), order = [];
    const touch = new Set([byRow[0]]);
    while (order.length < cells.length) {
      let best = -1, bestD = Infinity;
      const pool = touch.size ? touch : cells.filter(c => !placed.has(c));
      for (const c of pool) {
        let d = 0;
        for (const ci of consOf.get(c)) { if (!started[ci]) d++; if (left[ci] === 1) d--; }
        if (d < bestD || (d === bestD && byRow.indexOf(c) < byRow.indexOf(best))) { bestD = d; best = c; }
      }
      placed.add(best); touch.delete(best); order.push(best);
      for (const ci of consOf.get(best)) {
        started[ci] = 1; left[ci]--;
        for (const d of cons[ci].cells) if (!placed.has(d)) touch.add(d);
      }
    }
    cands.push(order);
  }
  let best = null, bestCost = Infinity;
  for (const o of cands) { const c = orderCost(o, cons); if (c < bestCost) { bestCost = c; best = o; } }
  return best;
}

// 1つの成分を数える。cells: 成分のマス（盤上の番号）、cons: {cells, w, off, mask}
// 制約の値は off + Σ w·x（w は各マスの重み ±1、x は地雷なら 1）。mask の bit v が立っていれば値 v を許す
// 戻り値: poly[k] = 地雷 k 個の解の数、mine[i][k] = cells[i] が地雷で地雷 k 個の解の数
function solveComponent(cells, cons, W, needMarginals, keep = false) {
  // 状態に乗る制約の数を減らすように並べる。行の順、列の順、途中の制約が増えにくい順に貪欲に選ぶ順の3つを作り、
  // 見積もった状態の数が一番少ないものを使う
  const order = pickOrder(cells, cons, W);
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
  // 制約の状態は、途中までの値 v そのものではなく、残りのマスで足しうる量 r ごとに「v + r を許すか」を並べた
  // ビット列（窓）で持つ。窓の bit j が r = j − neg（neg は残りの重み −1 のマスの数）に当たる。
  // 先の数え方は窓だけで決まるので、v が違っても窓が同じ状態は1つにまとまる（◐ なら偶奇の2通りになる）
  const span = C.map(k => {
    const r = new Int16Array(n);
    for (let i = 0; i < n; i++) r[i] = k.ps.filter(p => p > i).length;
    return r;
  });
  const startAt = Array.from({ length: n }, () => []);
  C.forEach((k, ci) => {
    startAt[k.first].push(ci);
    const neg = k.ps.filter(p => k.wt.get(p) < 0).length;
    k.win0 = (k.mask >> (k.off - neg)) & ((1 << (k.size + 1)) - 1);
  });
  // 位置 i のマスを x にした時、窓 a を次の窓にする。重み +1 なら r の上端が1つ減り、−1 なら下端が1つ減る
  const shift = (ci, i, a, x) => {
    const sh = C[ci].wt.get(i) > 0 ? x : 1 - x;
    return (a >> sh) & ((1 << (span[ci][i] + 1)) - 1);
  };
  // 状態のキー: active[i] の順に各制約の窓を1文字ずつ並べた文字列。trans[i] に遷移を覚えて後ろ向きでも使う
  const trans = Array.from({ length: n }, () => new Map());
  const move = (i, key) => {
    let t = trans[i].get(key);
    if (t) return t;
    const act = active[i], nact = active[i + 1];
    const win = new Map();
    act.forEach((ci, j) => win.set(ci, key.charCodeAt(j) - 1));
    for (const ci of startAt[i]) win.set(ci, C[ci].win0);
    t = [null, null];
    for (let x = 0; x <= 1; x++) {
      let ok = true;
      const w2 = new Map(win);
      for (const ci of cellCons[i]) {
        const a = shift(ci, i, w2.get(ci), x);
        if (!a) { ok = false; break; }
        w2.set(ci, a);
      }
      if (!ok) continue;
      let nkey = '';
      for (const ci of nact) nkey += String.fromCharCode(w2.get(ci) + 1);
      t[x] = nkey;
    }
    trans[i].set(key, t);
    return t;
  };

  const F = [new Map([['', new Float64Array([1])]])];
  for (let i = 0; i < n; i++) {
    const next = new Map();
    for (const [key, poly] of F[i]) {
      const t = move(i, key);
      for (let x = 0; x <= 1; x++) if (t[x] !== null) addInto(next, t[x], poly, x);
    }
    F.push(next);
  }
  const poly = F[n].get('') || new Float64Array(1);
  // keep: 世界を1つ引くために、前向きの表と遷移を返す
  if (keep) return { order, poly, F, trans, mine: null };
  if (!needMarginals) return { order, poly, mine: null };

  // 後ろ向き: B[i][key] = 位置 i 以降の埋め方の数（地雷数ごと）
  const B = new Array(n + 1);
  B[n] = new Map([['', new Float64Array([1])]]);
  const mine = Array.from({ length: n }, () => new Float64Array(n + 1));
  for (let i = n - 1; i >= 0; i--) {
    const cur = new Map();
    for (const [key, fpoly] of F[i]) {
      const t = move(i, key);
      for (let x = 0; x <= 1; x++) {
        if (t[x] === null) continue;
        const bpoly = B[i + 1].get(t[x]);
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
// 成分 comp（keep で数えたもの）の中で、地雷 k 個の埋め方を1つ等確率で引き、world に書く。
// 最後の位置から、そこへ遷移できる前の状態と x を、前の状態までの数え上げの重みで選ぶ
function sampleComponent(comp, k, rng, world) {
  const { order, F, trans } = comp;
  let key = '';
  for (let i = order.length - 1; i >= 0; i--) {
    const cands = [];
    let tot = 0;
    for (const [pk, poly] of F[i]) {
      const t = trans[i].get(pk);
      for (let x = 0; x <= 1; x++) {
        if (t[x] !== key || k - x < 0 || !(poly[k - x] > 0)) continue;
        cands.push([pk, x, poly[k - x]]);
        tot += poly[k - x];
      }
    }
    let u = rng() * tot, j = 0;
    while (j < cands.length - 1 && (u -= cands[j][2]) >= 0) j++;
    const [pk, x] = cands[j];
    world[order[i]] = x;
    k -= x;
    key = pk;
  }
}

// rng を渡すと、手がかりと矛盾しない世界を1つ等確率で引き、world（Uint8Array、1 = 地雷）で返す
export function analyze(W, H, M, opened, clues, needProbs = true, mines = null, area = null, rng = null) {
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
  const comps = [...groups.values()].map(g => solveComponent(g.cells, g.cons, W, needProbs && !rng, !!rng));

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
  if (rng && omega > 0) {
    // 成分ごとの地雷の数を、残りの成分と境界の外の組み合わせの数で重みを付けて順に引く
    const world = new Uint8Array(N);
    let left = M;
    for (let j = 0; j < m; j++) {
      const ws = comps[j].poly.map((p, kj) => {
        if (!p || kj > left) return 0;
        let s = 0;
        for (let K = 0; K < suf[j + 1].length; K++) if (suf[j + 1][K]) s += suf[j + 1][K] * binom(r, left - kj - K);
        return p * s;
      });
      let u = rng() * ws.reduce((a, b) => a + b, 0), kj = 0;
      while (kj < ws.length - 1 && (u -= ws[kj]) >= 0) kj++;
      while (!ws[kj]) kj--;
      sampleComponent(comps[j], kj, rng, world);
      left -= kj;
    }
    // 境界の外の r 個には、残りの地雷を等確率に置く
    const free = [];
    for (let i = 0; i < N; i++) if (!opened[i] && !parent.has(i)) free.push(i);
    for (let i = 0; i < left; i++) {
      const j = i + Math.floor(rng() * (free.length - i));
      [free[i], free[j]] = [free[j], free[i]];
      world[free[i]] = 1;
    }
    return { omega, prob, world };
  }
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
  // 値は（左 − 右）または（上 − 下）。多い側を矢印で、同数を両向きの矢印（⇔・⇕）で答えるので、表示だけで向きが分かる
  lr: { area: shape(LR), parts: [[[1, 2, 3], [0], [-3, -2, -1]]], fmt: cls => cls[0] > 0 ? '←' : cls[0] < 0 ? '→' : '⇔' },
  ud: { area: shape(UD), parts: [[[1, 2, 3], [0], [-3, -2, -1]]], fmt: cls => cls[0] > 0 ? '↑' : cls[0] < 0 ? '↓' : '⇕' },
};
export function classLabel(type, cls) {
  return DETECTORS[type].fmt(cls);
}
// 値の組を mask にする。値 v は off だけずらした bit v + off に置く
export const maskOf = (cls, off = 0) => cls.reduce((m, n) => m | (1 << (n + off)), 0);
