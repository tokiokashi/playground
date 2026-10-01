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
  meta.json   # { "title": "...", "description": "...", "tags": ["WebGPU"], "date": "2026-10-01" }
```

`tags` に使った技術を書くと、一覧にそのまま出る。実験の記録として使う。

## 開発の準備

clone したあとに1度だけ、コミットメッセージのフックを有効にする。

```bash
git config core.hooksPath .githooks
```

`.githooks/commit-msg` が、コミットメッセージからセッションURLの行（`Claude-Session:`）を消し、Claude の共作者の行（`Co-Authored-By: Claude …`）からメールアドレスを外す。

## 守ること

- 公開リポジトリ。会社のコード・データ・社内情報は入れない。
- 外部の画像・フォント・データを使う時は、ライセンスを確認して出典を書く。
