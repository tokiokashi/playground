# playground

AIと作った小さなブラウザ作品と、新しい技術の実験場。GitHub Pages で公開している。

**公開ページ: https://tokiokashi.github.io/playground/**

## 構成

- 作品は1つずつトップ階層のディレクトリに置く。`meta.json` があるディレクトリだけが公開対象になる。
- `package.json` が無い作品は、ファイルをそのまま配信する（単体 HTML など）。
- `package.json` がある作品は、`npm run build` した出力（既定は `dist/`、`meta.json` の `out` で変更可）を配信する。
- `scripts/build.mjs` が全作品を `dist/` にまとめ、一覧ページを作る。`main` への push で Actions が Pages に反映する。

## 作品を足す

```
my-toy/
  index.html
  meta.json   # { "title": "...", "description": "...", "tags": ["WebGPU"], "date": "2026-10-01 21:17" }
```

`date` は初回公開日時（JST、`YYYY-MM-DD HH:MM`）。一覧はこの順に新しいものから並ぶ。`tags` に使った技術を書くと、一覧にそのまま出る。実験の記録として使う。

## 開発の準備

clone したあとに1度だけ、コミットメッセージのフックを有効にする。

```bash
git config core.hooksPath .githooks
```

`.githooks/commit-msg` が、コミットメッセージからセッションURLの行（`Claude-Session:`）を消し、Claude の共作者の行（`Co-Authored-By: Claude …`）からメールアドレスを外す。

スマホ幅の検査を手元で回す時は、playwright を入れてから実行する（バージョンは `.github/workflows/ci.yml` の `PLAYWRIGHT_VERSION` に合わせる）。PR では CI が同じ検査を回し、スクリーンショットをアーティファクトに上げる。

```bash
npm install --no-save --no-package-lock playwright@1.56.1
npx playwright install chromium
node scripts/build.mjs && node scripts/check-mobile.mjs   # shots/ にスクリーンショットが出る
```

## 守ること

- 公開リポジトリ。会社のコード・データ・社内情報は入れない。
- 外部の画像・フォント・データを使う時は、ライセンスを確認して出典を書く。
