// 各作品ディレクトリ(meta.json を持つもの)を dist/<名前>/ にまとめ、一覧ページを作る。
// package.json があればビルドする。出力先は meta.json の "out"(既定 "dist")。
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const SKIP = new Set(['node_modules', 'dist', 'scripts', '.git', '.github']);
const works = [];

for (const ent of readdirSync(root, { withFileTypes: true })) {
  if (!ent.isDirectory() || SKIP.has(ent.name) || ent.name.startsWith('.')) continue;
  const dir = join(root, ent.name);
  const metaPath = join(dir, 'meta.json');
  if (!existsSync(metaPath)) continue;
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  // 一覧は date の文字列順で並べるので、形をそろえないと順番が崩れる
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(meta.date || '')) {
    throw new Error(`${ent.name}/meta.json: date は "YYYY-MM-DD HH:MM"(JST)で書く。今の値: ${JSON.stringify(meta.date)}`);
  }
  let src = dir;
  if (existsSync(join(dir, 'package.json'))) {
    console.log(`build: ${ent.name}`);
    const lock = existsSync(join(dir, 'package-lock.json'));
    execSync(lock ? 'npm ci' : 'npm install', { cwd: dir, stdio: 'inherit' });
    // 相対パスで配信されるように base を渡す(Vite など)。不要な作品は無視してよい。
    execSync('npm run build', { cwd: dir, stdio: 'inherit', env: { ...process.env, BASE_PATH: `./` } });
    src = join(dir, meta.out || 'dist');
  }
  cpSync(src, join(dist, ent.name), { recursive: true, filter: p => !p.includes('node_modules') });
  if (src === dir) versionImports(join(dist, ent.name));
  works.push({ slug: ent.name, ...meta });
}

// ビルドしない作品は、相対パスで import する .js に作品の中身から作った版（?v=）を付ける。
// 配信のキャッシュで、新しいページが古いモジュールを読んで食い違うのを防ぐ
function versionImports(out) {
  const files = readdirSync(out, { recursive: true }).map(String).filter(f => /\.(html|js|mjs)$/.test(f)).sort();
  const hash = createHash('sha256');
  for (const f of files) hash.update(f).update(readFileSync(join(out, f)));
  const v = hash.digest('hex').slice(0, 10);
  const re = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|<script\b[^>]*\bsrc=)(['"])(\.{1,2}\/[^'"?#]+\.m?js)\2/g;
  for (const f of files) {
    const text = readFileSync(join(out, f), 'utf8');
    const next = text.replace(re, (_, head, q, path) => `${head}${q}${path}?v=${v}${q}`);
    if (next !== text) writeFileSync(join(out, f), next);
  }
}

works.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>playground</title>
<style>
:root{--bg:#0a1222;--panel:#0e1a30;--line:#243456;--ink:#e6ecf7;--mute:#93a0bd;--gold:#f3c75c;--pole:#5ad3c2;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:400 15px/1.7 "Hiragino Sans","Yu Gothic",system-ui,sans-serif;padding:32px 16px}
main{max-width:880px;margin:0 auto}
h1{margin:0;font:700 clamp(26px,5vw,38px)/1.2 "Hiragino Mincho ProN","Yu Mincho",serif}
p.lead{color:var(--mute);margin:8px 0 28px}
ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
a.card{display:flex;flex-direction:column;gap:8px;height:100%;padding:16px;background:var(--panel);border:1px solid var(--line);border-radius:8px;color:inherit;text-decoration:none}
a.card:hover,a.card:focus-visible{border-color:var(--gold);outline:none}
.date{font-size:12px;color:var(--mute);font-variant-numeric:tabular-nums;line-height:1}
.t{font-weight:700;font-size:17px}
.d{color:var(--mute);font-size:13.5px;flex:1}
.m{display:flex;flex-wrap:wrap;gap:6px;font-size:12px}
.tag{border:1px solid var(--line);border-radius:4px;padding:1px 7px;color:var(--pole)}
</style></head><body><main>
<h1>playground</h1>
<p class="lead">AIと作った小さな作品と、新しい技術の実験場。</p>
<ul>
${works.map(w => `<li><a class="card" href="./${esc(w.slug)}/"><span class="date">${esc(w.date)}</span><span class="t">${esc(w.title || w.slug)}</span><span class="d">${esc(w.description)}</span><span class="m">${(w.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</span></a></li>`).join('\n')}
</ul>
</main></body></html>
`;
writeFileSync(join(dist, 'index.html'), html);
writeFileSync(join(dist, '.nojekyll'), '');
console.log(`done: ${works.length} works`);
