# playground

公開リポジトリ。AI と作った小さなブラウザ作品の置き場で、新しい技術の実験場でもある。

- 作品はトップ階層のディレクトリ1つ。`meta.json`（title / description / tags / date）が必須。
- 技術は作品ごとに自由に選んでよい。ビルドが要る時だけ `package.json` を置き、`npm run build` を通す。相対パスで動くようにする（`BASE_PATH=./` が渡る）。
- 会社のコード・データ・社内情報は絶対に入れない。
- Issue・PR のタイトルと本文は日本語で書く。
- コミットメッセージは `種別(作品名): 日本語の要約` の形にする（例: `feat(polaris-time): PCで1画面に収まる配置に変える`）。種別は feat / fix / chore / revert / docs など。リポジトリ全体の変更は `(作品名)` を省く。
- 追加したら `node scripts/build.mjs` が通ること、`dist/<作品名>/` をブラウザで開いて動くことを確認する。
- コミットメッセージとPR本文に、`Claude-Session:` の行とセッションURLを入れない（公開リポジトリなので、セッションの出入りを外から読まれないようにする）。
- clone したら `git config core.hooksPath .githooks` を実行する。`.githooks/commit-msg` が次の2つを機械的に行う（上の決まりと二重に守る）。
  - `Claude-Session:` の行を消す
  - `Co-Authored-By: Claude … <メール>` の行から、メールアドレスだけを外す（行は `Co-Authored-By: Claude …` のまま残す）
- API 経由のコミットはフックを通らない。PR本文やAPIで上げるメッセージには、セッションURLを入れず、共作者の行にもメールアドレスを付けない。
