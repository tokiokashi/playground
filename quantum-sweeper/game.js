// 盤の進行。DOM には触らない（node から試せるようにする）。
import { analyze, binom, neighbors, DETECTORS, maskOf, classLabel } from './engine.js';

const FUZZY_MIX = [['exact', 0.5], ['range', 0.2], ['pair', 0.15], ['parity', 0.15]];

export class Game {
  constructor(W, H, M, fuzzy, rng = Math.random) {
    Object.assign(this, { W, H, M, rng });
    const N = W * H;
    this.N = N;
    // 検出器の種類はマスごとに最初から決まっていて、開ける前から見える
    this.det = Array.from({ length: N }, () => {
      if (!fuzzy) return 'exact';
      let u = rng();
      for (const [t, w] of FUZZY_MIX) { if ((u -= w) < 0) return t; }
      return 'exact';
    });
    this.opened = new Uint8Array(N);
    this.clues = new Map();
    this.label = new Array(N).fill('');
    this.flags = new Set();
    this.H0 = Math.log2(binom(N, M));
    this.L = 0;   // 生き残ることで削った世界（命で払ったビット）
    this.I = 0;   // 手がかりを見ることで削った世界（観測で得たビット）
    this.moves = [];
    this.state = 'play';
    this.refresh();
  }

  refresh() {
    this.an = analyze(this.W, this.H, this.M, this.opened, this.clues);
    if (this.an.omega < 1.5) this.state = 'clear';
  }
  get bitsLeft() { return Math.log2(this.an.omega); }
  prob(c) { return this.an.prob[c]; }

  // マス c を踏む。戻り値: { p, cost, opened: [開いたマス] }
  step(c) {
    if (this.state !== 'play' || this.opened[c]) return null;
    const p = this.an.prob[c];
    let pmin = 1;
    for (let i = 0; i < this.N; i++) if (!this.opened[i]) pmin = Math.min(pmin, this.an.prob[i]);
    if (p > 1 - 1e-9) {
      this.state = 'dead';
      this.moves.push({ c, p, pmin, cost: Infinity, costMin: -Math.log2(1 - pmin) });
      return { p, cost: Infinity, opened: [] };
    }
    const cost = -Math.log2(1 - p);
    this.L += cost;
    this.moves.push({ c, p, pmin, cost, costMin: -Math.log2(1 - pmin) });
    const opened = [c];
    this.observe(c);
    this.cascade(opened);
    // Ω = 1 なら残りの安全なマスの数字も1つに決まっているので、全部開けて見せる
    if (this.state === 'clear') {
      for (let i = 0; i < this.N; i++) if (!this.opened[i] && this.an.prob[i] === 0) { this.observe(i); opened.push(i); }
      this.refresh();
    }
    return { p, cost, opened };
  }

  // c を開け、生き残った世界の中から c の手がかりを1つ引く
  observe(c) {
    this.opened[c] = 1;
    this.flags.delete(c);
    const { W, H, M } = this;
    const survive = analyze(W, H, M, this.opened, this.clues, false).omega;
    const classes = DETECTORS[this.det[c]].classes;
    const weights = classes.map(cls => {
      this.clues.set(c, maskOf(cls));
      return analyze(W, H, M, this.opened, this.clues, false).omega;
    });
    let u = this.rng() * weights.reduce((a, b) => a + b, 0), pick = 0;
    while (pick < weights.length - 1 && (u -= weights[pick]) >= 0) pick++;
    while (!weights[pick]) pick--;
    this.clues.set(c, maskOf(classes[pick]));
    this.label[c] = classLabel(this.det[c], classes[pick]);
    this.I += Math.log2(survive / weights[pick]);
  }

  // 普通のマインスイーパーと同じく、精密な 0 の周りだけを続けて開ける。
  // それ以外の安全なマスは自分で推理して開ける
  cascade(opened) {
    const queue = opened.slice();
    while (queue.length) {
      const c = queue.pop();
      if (this.clues.get(c) !== 1) continue;
      for (const d of neighbors(c, this.W, this.H)) {
        if (this.opened[d]) continue;
        this.observe(d);
        opened.push(d);
        queue.push(d);
      }
    }
    this.refresh();
  }

  // L を手ごとに3つに分ける。どれも踏んだ時点の盤面だけで決まり、後で引かれた数字の運に左右されない
  //   error: 全ての世界で安全なマスが残っていたのに p > 0 を踏んだコスト（推理ミス）
  //   gap:   賭けるしかない時に、一番安全なマスより危ないマスを選んだ差（賭けの損）
  //   forced: 賭けるしかない時の、一番安全なマスのコスト（不可避）
  get breakdown() {
    let error = 0, gap = 0, forced = 0, errors = 0;
    for (const m of this.moves) {
      if (!isFinite(m.cost)) continue;
      if (m.pmin === 0) { error += m.cost; if (m.cost > 0) errors++; }
      else { forced += m.costMin; gap += m.cost - m.costMin; }
    }
    return { error, gap, forced, errors };
  }
}

// 推理の評価は、運に左右されない「推理ミス + 賭けの損」（ビット）で付ける
export function rank(loss) {
  return loss <= 0.05 ? 'S+' : loss <= 0.5 ? 'S' : loss <= 1.5 ? 'A' : loss <= 3 ? 'B' : 'C';
}

// 最小コストモードは、払った L の合計を log₂Ω₀ に対する割合で評価する
export function rankCost(ratio) {
  return ratio <= 0.01 ? 'S+' : ratio <= 0.03 ? 'S' : ratio <= 0.06 ? 'A' : ratio <= 0.12 ? 'B' : 'C';
}
