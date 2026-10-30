// 作品の fonts/ に置いた woff2（使う字だけに絞ったフォント）に、作品の .html と .js に出てくる字が
// すべて入っているかを確かめる。文を変えたのにフォントを作り直し忘れると、足りない字を挙げて止まる。
// 元のフォントにも無い字（記号など）は、<フォント名>.noglyph.txt に並べておけば数えない。
// フォントを作り直した直後に `--update` を付けて実行すると、今足りない字でこのファイルを書き直す。
// woff2 は Node の brotli で展開し、cmap 表だけを読む。
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { brotliDecompressSync } from 'node:zlib';

const root = new URL('..', import.meta.url).pathname;
// woff2 の表の名前の番号（仕様の Known Table Tags の先頭だけ。cmap は 0 番）
const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep'];

function base128(buf, pos) {
  let v = 0;
  for (let i = 0; i < 5; i++) {
    const b = buf[pos.i++];
    v = v * 128 + (b & 0x7f);
    if (!(b & 0x80)) return v;
  }
  throw new Error('UIntBase128 が長すぎる');
}

// woff2 から cmap 表のバイト列を取り出す
function cmapOf(file) {
  const buf = readFileSync(file);
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error(`${file} は woff2 ではない`);
  const numTables = buf.readUInt16BE(12);
  const compressed = buf.readUInt32BE(20);
  const pos = { i: 48 };
  const tables = [];
  for (let t = 0; t < numTables; t++) {
    const flags = buf[pos.i++];
    let tag;
    if ((flags & 0x3f) === 0x3f) { tag = buf.toString('latin1', pos.i, pos.i + 4); pos.i += 4; } else tag = KNOWN[flags & 0x3f] ?? `#${flags & 0x3f}`;
    const orig = base128(buf, pos);
    const ver = flags >> 6;
    // glyf と loca は変換版 0 が「変換あり」、それ以外の表は 0 以外が「変換あり」
    const transformed = (tag === 'glyf' || tag === 'loca') ? ver === 0 : ver !== 0;
    tables.push({ tag, len: transformed ? base128(buf, pos) : orig });
  }
  const data = brotliDecompressSync(buf.subarray(pos.i, pos.i + compressed));
  let off = 0;
  for (const t of tables) {
    if (t.tag === 'cmap') return data.subarray(off, off + t.len);
    off += t.len;
  }
  throw new Error(`${file} に cmap 表が無い`);
}

// cmap の format 4 と 12 の部分表から、字のある符号位置を集める
function codepoints(cmap) {
  const set = new Set();
  const n = cmap.readUInt16BE(2);
  for (let k = 0; k < n; k++) {
    const sub = cmap.readUInt32BE(4 + k * 8 + 4);
    const fmt = cmap.readUInt16BE(sub);
    if (fmt === 4) {
      const segs = cmap.readUInt16BE(sub + 6) / 2;
      const ends = sub + 14, starts = ends + segs * 2 + 2, deltas = starts + segs * 2, ranges = deltas + segs * 2;
      for (let s = 0; s < segs; s++) {
        const end = cmap.readUInt16BE(ends + s * 2), start = cmap.readUInt16BE(starts + s * 2);
        const delta = cmap.readInt16BE(deltas + s * 2), ro = cmap.readUInt16BE(ranges + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          const g = ro === 0 ? (c + delta) & 0xffff : cmap.readUInt16BE(ranges + s * 2 + ro + (c - start) * 2);
          if (g !== 0) set.add(c);
        }
      }
    } else if (fmt === 12) {
      const groups = cmap.readUInt32BE(sub + 12);
      for (let g = 0; g < groups; g++) {
        const p = sub + 16 + g * 12;
        for (let c = cmap.readUInt32BE(p); c <= cmap.readUInt32BE(p + 4); c++) set.add(c);
      }
    }
  }
  return set;
}

const update = process.argv.includes('--update');
let failed = false;
for (const ent of readdirSync(root, { withFileTypes: true })) {
  const fonts = join(root, ent.name, 'fonts');
  if (!ent.isDirectory() || ent.name.startsWith('.') || !existsSync(fonts) || !statSync(fonts).isDirectory()) continue;
  const text = readdirSync(join(root, ent.name)).filter(f => /\.(html|js)$/.test(f))
    .map(f => readFileSync(join(root, ent.name, f), 'utf8')).join('');
  const chars = [...new Set(text)].filter(c => c.codePointAt(0) >= 0x20);
  for (const f of readdirSync(fonts).filter(f => f.endsWith('.woff2'))) {
    const have = codepoints(cmapOf(join(fonts, f)));
    const list = join(fonts, f.replace(/\.woff2$/, '.noglyph.txt'));
    if (update) {
      writeFileSync(list, chars.filter(c => !have.has(c.codePointAt(0))).join('') + '\n');
      console.log(`${ent.name}/fonts/${f}: 無い字の一覧を書き直した`);
      continue;
    }
    const known = new Set(existsSync(list) ? [...readFileSync(list, 'utf8').trim()] : []);
    const missing = chars.filter(c => !have.has(c.codePointAt(0)) && !known.has(c));
    if (missing.length) {
      failed = true;
      console.error(`${ent.name}/fonts/${f} に無い字（${missing.length}）: ${missing.join('')}`);
      console.error(`  ${ent.name}/fonts/README.md の手順でフォントを作り直す`);
    } else console.log(`${ent.name}/fonts/${f}: ${chars.length} 字のうち、元のフォントにある字はすべてあり`);
  }
}
if (failed) process.exit(1);
