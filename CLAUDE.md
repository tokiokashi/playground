# playground

公開リポジトリ。AI と作った小さなブラウザ作品の置き場で、新しい技術の実験場でもある。

- 作品はトップ階層のディレクトリ1つ。`meta.json`（title / description / tags / date）が必須。`date` は初回公開日で、更新しても変えない。
- 技術は作品ごとに自由に選んでよい。ビルドが要る時だけ `package.json` を置き、`npm run build` を通す。相対パスで動くようにする（`BASE_PATH=./` が渡る）。
- 会社のコード・データ・社内情報は絶対に入れない。
- 外部の画像・フォント・データ・ライブラリを使う時は、ライセンスが公開リポジトリでの再配布・利用を許すか確認し、作品内（画面の注記か作品ディレクトリの README）に出典とライセンス名を書く。
- Issue・PR のタイトルと本文は日本語で書く。
- コミットメッセージは Angular スタイルの `<type>(<scope>): <subject>` にする（例: `feat(polaris-time): PCで1画面に収まる配置に変える`）。
  - type: feat / fix / docs / style / refactor / perf / test / build / ci / chore / revert
  - scope: 作品のディレクトリ名。リポジトリ全体の変更は `(scope)` を省く
  - subject: 日本語で、何をするかを1行で書く。末尾に句点を付けない
- PR のマージはユーザーが決める。Claude は PR を作って CI を通すところまでで、マージしない。
- 追加・変更したら次を確認する。PR では CI（`.github/workflows/ci.yml`）が 1 と 2 を自動で回す。
  1. `node scripts/build.mjs` が通る
  2. `node scripts/check-mobile.mjs` が通る。スマホ幅（360px、タッチ有効）でページのエラーと横スクロールが出ないことを検査し、`shots/` にスクリーンショットを保存する。playwright は `npm install --no-save --no-package-lock playwright@<ci.yml の PLAYWRIGHT_VERSION>` で入れる
  3. `dist/<作品名>/` をブラウザで開いて動く。スマホでの操作がタップで成り立つこと（ホバー前提の操作やキーボード専用の操作だけにしない）も見る
- コミットメッセージとPR本文に、`Claude-Session:` の行とセッションURLを入れない（公開リポジトリなので、セッションの出入りを外から読まれないようにする）。
- clone したら `git config core.hooksPath .githooks` を実行する。`.githooks/commit-msg` が次の2つを機械的に行う（上の決まりと二重に守る）。
  - `Claude-Session:` の行を消す
  - `Co-Authored-By: Claude … <メール>` の行から、メールアドレスだけを外す（行は `Co-Authored-By: Claude …` のまま残す）
- API 経由のコミットはフックを通らない。PR本文やAPIで上げるメッセージには、セッションURLを入れず、共作者の行にもメールアドレスを付けない。
