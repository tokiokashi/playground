// dist/ の一覧ページと各作品を、スマホ幅(360x740、タッチ有効)で開いて検査する。
// 検査: ページのエラーが出ないこと、自前のファイルの取得に失敗しないこと、横スクロールが出ないこと。
// 外部(フォントの CDN など)の取得失敗は実行環境のネットワーク次第なので、警告だけにする。
// スクリーンショットを shots/ に保存する(CI ではアーティファクトとして上げる)。
// 先に node scripts/build.mjs を実行しておくこと。playwright は npm install --no-save playwright で入れる。
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const dist = join(root, 'dist');
const shots = join(root, 'shots');
if (!existsSync(dist)) { console.error('dist/ が無い。先に node scripts/build.mjs を実行する'); process.exit(1); }
mkdirSync(shots, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.wasm': 'application/wasm', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let p = normalize(join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!p.startsWith(dist)) { res.writeHead(403).end(); return; }
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }).end(readFileSync(p));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const pages = [['(一覧)', ''], ...readdirSync(dist, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => [e.name, e.name + '/'])];
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
let failed = 0;
for (const [name, path] of pages) {
  const page = await ctx.newPage();
  const errors = [], warnings = [];
  const own = u => u.startsWith(base);
  page.on('pageerror', e => errors.push(e.message));
  // 取得失敗は requestfailed / response 側で拾うので、console の重複メッセージは捨てる
  page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  page.on('requestfailed', r => (own(r.url()) ? errors : warnings).push(`取得失敗 ${r.url()} (${r.failure()?.errorText})`));
  page.on('response', r => { if (r.status() >= 400) (own(r.url()) ? errors : warnings).push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(base + path, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (sw > cw + 1) errors.push(`横スクロールが出る(内容幅 ${sw}px > 画面幅 ${cw}px)`);
  await page.screenshot({ path: join(shots, (path.replace(/\/$/, '') || 'index') + '.png'), fullPage: true });
  console.log(`${errors.length ? 'NG' : 'OK'}  ${name}`);
  for (const e of errors) console.log(`      ${e}`);
  for (const w of warnings) console.log(`      (警告) ${w}`);
  failed += errors.length ? 1 : 0;
  await page.close();
}
await browser.close();
server.close();
if (failed) { console.error(`${failed} ページで問題あり`); process.exit(1); }
