// 盤の進行。DOM には触らない（node から試せるようにする）。
import { analyze, binom, neighbors, DETECTORS, maskOf, classLabel } from './engine.js';

// 検出器の割合のプリセット（精密・幅・二重・偶奇・広い幅の順、%）
export const TYPES = ['exact', 'range', 'pair', 'parity', 'wide'];
export const MIXES = [
  [100, 0, 0, 0, 0],
  [60, 10, 10, 10, 10],
  [35, 15, 15, 15, 20],
  [0, 25, 20, 25, 30],
];

export class Game {
  constructor(W, H, M, mix = MIXES[1], rng = Math.random) {
    Object.assign(this, { W, H, M, rng });
    const N = W * H;
    this.N = N;
    // 検出器の種類はマスごとに最初から決まっていて、開ける前から見える。割合が全て 0 なら精密だけ
    const total = mix.reduce((a, b) => a + b, 0);
    if (!total) mix = MIXES[0];
    this.det = Array.from({ length: N }, () => {
      let u = rng() * total;
      for (let j = 0; j < TYPES.length; j++) if ((u -= mix[j]) < 0) return TYPES[j];
      return 'exact';
    });
    // 区切りの位置が何通りかある種類は、どれで分けるかもマスごとにくじで決めておく（開けるまで見えない）
    this.classes = this.det.map(t => { const ps = DETECTORS[t].parts; return ps[Math.floor(rng() * ps.length)]; });
    this.opened = new Uint8Array(N);
    this.clues = new Map();
    this.label = new Array(N).fill('');
    this.mines = new Set();   // 地雷に賭けて確定させたマス
    this.H0 = Math.log2(binom(N, M));
    this.L = 0;   // 生き残ることで削った世界（命で払ったビット）
    this.I = 0;   // 手がかりを見ることで削った世界（観測で得たビット）
    this.moves = [];
    this.landed = false;
    this.state = 'play';
    this.refresh();
  }

  refresh() {
    this.dirty = false;
    this.an = analyze(this.W, this.H, this.M, this.opened, this.clues, true, this.mines);
    if (this.an.omega < 1.5) this.state = 'clear';
  }
  get bitsLeft() { return Math.log2(this.an.omega); }
  prob(c) { return this.an.prob[c]; }

  // マスに賭ける観測は2種類あり、外れた世界が消える。
  //   開ける（安全に賭ける）: 地雷があった世界が消える。コスト −log₂(1−p)。生き残ると手がかりが出る
  //   地雷に賭ける: 地雷が無かった世界が消える。コスト −log₂p。手がかりは出ない
  // どちらも全ての世界で外れるマス（開けるなら p = 1、地雷に賭けるなら p = 0）ではゲームオーバー

  // まだ賭けられるマス（開けていない、地雷に賭けていない）
  free(c) { return !this.opened[c] && !this.mines.has(c); }

  // 賭ける前の盤面の記録: 全ての世界で安全なマスがあるか、外れうる賭けのうち一番安いもの
  // （コスト best、マス bestCell、種類 bestKind: 'open' か 'mine'、そのマスの確率 bestP）
  situation() {
    let safeExists = false, best = Infinity, bestCell = -1, bestKind = 'open', bestP = 0;
    for (let i = 0; i < this.N; i++) {
      if (!this.free(i)) continue;
      const p = this.an.prob[i];
      if (p === 0) safeExists = true;
      else if (p < 1) {
        const co = -Math.log2(1 - p), cm = -Math.log2(p);
        if (co < best) { best = co; bestCell = i; bestKind = 'open'; bestP = p; }
        if (cm < best) { best = cm; bestCell = i; bestKind = 'mine'; bestP = p; }
      }
    }
    return { safeExists, best, bestCell, bestKind, bestP };
  }

  // マス c を踏み、0 の連鎖などを済ませる。戻り値: { p, cost, opened: [開いたマス] }
  step(c) {
    const r = this.open(c);
    if (r && this.state === 'play') this.settle(r.opened);
    return r;
  }

  // マス c を踏む（0 の連鎖などはしない）
  open(c) {
    if (this.state !== 'play' || !this.free(c)) return null;
    // 直前に別のマスを開けていれば確率が古いので数え直す
    if (this.dirty) this.refresh();
    if (this.state !== 'play') return null;
    if (!this.landed) { const r = this.land(c); if (r) return r; }
    const p = this.an.prob[c];
    const sit = this.situation();
    if (p > 1 - 1e-9) {
      this.state = 'dead';
      this.moves.push({ kind: 'open', c, p, cost: Infinity, ...sit });
      return { p, cost: Infinity, opened: [] };
    }
    const cost = -Math.log2(1 - p);
    this.L += cost;
    this.moves.push({ kind: 'open', c, p, cost, ...sit });
    this.observe(c);
    return { p, cost, opened: [c] };
  }

  // 最初に開けるマスは、プレイヤーが降り立つ場所。そこと周りの8マスが空の世界だけを残し、コストは取らない。
  // 削った分は運でも数字でもないので、Ω₀ の側から引き、Ω₀ を降り立った直後の世界の数にする（L + I = log₂Ω₀ を保つ）。
  // 地雷が多くて周りまで空にできない盤では、降り立つマスだけを空にする
  land(c) {
    this.landed = true;
    const { W, H, M } = this;
    const before = this.an.omega, sit = this.situation();
    const area = [c, ...neighbors(c, W, H)].filter(d => this.free(d));
    for (const cells of [area, [c]]) {
      for (const d of cells) this.opened[d] = 1;
      const after = analyze(W, H, M, this.opened, this.clues, false, this.mines).omega;
      if (after > 0) {
        this.H0 -= Math.log2(before / after);
        this.moves.push({ kind: 'open', c, p: 0, cost: 0, ...sit });
        for (const d of cells) this.observe(d);
        return { p: 0, cost: 0, opened: cells.slice() };
      }
      for (const d of cells) this.opened[d] = 0;
    }
    return null;
  }

  // マス c の地雷に賭ける。戻り値: { p, cost, opened }
  claim(c) {
    // 降り立つ前は ◆ を置けない。最初の一歩は必ず ◇ で降り立つ場所を選ぶ
    if (this.state !== 'play' || !this.free(c) || !this.landed) return null;
    if (this.dirty) this.refresh();
    if (this.state !== 'play') return null;
    const p = this.an.prob[c];
    const sit = this.situation();
    if (p < 1e-9) {
      this.state = 'dead';
      this.moves.push({ kind: 'mine', c, p, cost: Infinity, ...sit });
      return { p, cost: Infinity, opened: [] };
    }
    const cost = -Math.log2(p);
    this.L += cost;
    this.moves.push({ kind: 'mine', c, p, cost, ...sit });
    this.mines.add(c);
    this.dirty = true;
    const opened = [];
    this.settle(opened);
    return { p, cost, opened };
  }

  // c を開け、生き残った世界の中から c の手がかりを1つ引く
  observe(c) {
    this.opened[c] = 1;
    this.dirty = true;
    const { W, H, M } = this;
    const survive = analyze(W, H, M, this.opened, this.clues, false, this.mines).omega;
    const classes = this.classes[c];
    const weights = classes.map(cls => {
      this.clues.set(c, maskOf(cls));
      return analyze(W, H, M, this.opened, this.clues, false, this.mines).omega;
    });
    let u = this.rng() * weights.reduce((a, b) => a + b, 0), pick = 0;
    while (pick < weights.length - 1 && (u -= weights[pick]) >= 0) pick++;
    while (!weights[pick]) pick--;
    this.clues.set(c, maskOf(classes[pick]));
    this.label[c] = classLabel(this.det[c], classes[pick]);
    this.I += Math.log2(survive / weights[pick]);
  }

  // 普通のマインスイーパーと同じく、0 と確定した手がかりの周りだけを続けて開ける。
  // それ以外の安全なマスは自分で推理して開ける
  cascade(opened) {
    const queue = opened.slice();
    while (queue.length) {
      const c = queue.pop();
      if (this.clues.get(c) !== 1) continue;
      for (const d of neighbors(c, this.W, this.H)) {
        if (!this.free(d)) continue;
        this.observe(d);
        opened.push(d);
        queue.push(d);
      }
    }
    this.refresh();
  }

  // 0 の連鎖、◆ で決まるマスの自動開放（有効な時）、クリア時の残りの開放をまとめて行う。
  // 自動で開けたマスの数とマスを this.auto に残す
  settle(opened = []) {
    this.auto = { count: 0, cells: [] };
    this.cascade(opened);
    if (this.autoChord) {
      for (;;) {
        const targets = new Set();
        for (const c of this.clues.keys()) for (const t of this.chordTargets(c)) targets.add(t);
        if (!targets.size) break;
        for (const t of targets) {
          if (this.state !== 'play') break;
          const r = this.open(t);
          if (!r) continue;
          this.auto.count++;
          this.auto.cells.push(t);
          opened.push(t);
        }
        if (this.state !== 'play') break;
        this.cascade(opened);
      }
    }
    // Ω = 1 なら残りの安全なマスの数字も1つに決まっているので、全部開けて見せる
    if (this.state === 'clear') {
      for (let i = 0; i < this.N; i++) if (this.free(i) && this.an.prob[i] === 0) { this.observe(i); opened.push(i); }
      this.refresh();
    }
    return opened;
  }

  // 開いた手がかりのマス c を押した時に開けるマス。普通のマインスイーパーの同時開けと同じく、
  // その手がかりと周りの ◆ だけで「残りは安全」と決まる時に限る。◆ のマスは生き残った全ての世界で地雷なので、
  // ここで開けるマスは必ずコスト 0 になる
  chordTargets(c) {
    if (!this.opened[c] || !this.clues.has(c)) return [];
    const mask = this.clues.get(c);
    let f = 0;
    const rest = [];
    for (const d of neighbors(c, this.W, this.H)) {
      if (this.opened[d]) continue;
      if (this.mines.has(d)) f++; else rest.push(d);
    }
    if (!rest.length) return [];
    // ◆ の数 f から f + 残り の範囲で、手がかりが許す値が f だけなら残りは安全
    const window = (mask >> f) & ((1 << (rest.length + 1)) - 1);
    return window === 1 ? rest : [];
  }

  // 自動で打つ次の手。降り立った後は、p = 100% のマスがあれば ◆、無ければ全ての世界で安全なマスを開ける
  // （手がかり1つと周りの ◆ だけで読めるマスを先に）、それも無ければ一番安い賭けを打つ。
  // 戻り値は { c: マス, kind: 'open' か 'mine' }。打てる手が無ければ null
  botMove() {
    if (this.state !== 'play') return null;
    // 最初は盤の中央に降り立つ
    if (!this.landed) return { c: (this.H >> 1) * this.W + (this.W >> 1), kind: 'open' };
    if (this.dirty) this.refresh();
    let safe = -1;
    for (let i = 0; i < this.N; i++) {
      if (!this.free(i)) continue;
      const p = this.an.prob[i];
      if (p > 1 - 1e-12) return { c: i, kind: 'mine' };
      if (p < 1e-12 && safe < 0) safe = i;
    }
    for (const c of this.clues.keys()) {
      const t = this.chordTargets(c).find(d => this.free(d));
      if (t !== undefined) return { c: t, kind: 'open' };
    }
    if (safe >= 0) return { c: safe, kind: 'open' };
    const s = this.situation();
    return s.bestCell < 0 ? null : { c: s.bestCell, kind: s.bestKind };
  }

  // L を手ごとに3つに分ける。どれも賭けた時点の盤面だけで決まり、後で引かれた数字の運に左右されない。
  // 開けると地雷に賭けるの両方を候補として比べる。コスト 0 の手（p = 0 を開ける、p = 1 に賭ける）は数えない
  //   error:  全ての世界で安全なマスが残っていたのに、外れうる賭けをしたコスト（推理ミス）
  //   gap:    賭けるしかない時に、一番安い賭けより高い賭けを選んだ差（賭けの損）
  //   forced: 賭けるしかない時の、一番安い賭けのコスト（不可避）
  get breakdown() {
    let error = 0, gap = 0, forced = 0, errors = 0, mineCost = 0;
    for (const m of this.moves) {
      if (!isFinite(m.cost) || m.cost === 0) continue;
      if (m.kind === 'mine') mineCost += m.cost;
      if (m.safeExists) { error += m.cost; errors++; }
      else { forced += m.best; gap += m.cost - m.best; }
    }
    return { error, gap, forced, errors, mineCost };
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
