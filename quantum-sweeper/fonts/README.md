# fonts

## New Tegomin

- `NewTegomin-subset.woff2`: New Tegomin（Regular）から、この作品の `index.html`・`game.js`・`engine.js` に出てくる字だけを残したもの。○ ● などの記号（× と U+2190〜U+2BFF）は、盤や操作の部品と形をそろえるため入れず、本文の書体で出す
- 出典: https://github.com/nagamaki008/NewTegomin （Google Fonts で配布されているもの）
- ライセンス: SIL Open Font License 1.1（`OFL.txt`）
- Copyright 2020 The New Tegomin Project Authors

施設が語る文（観測記録の見出しと文、説明の札、結果画面の文）にだけ使う。

### 作り直し方

文を変えて新しい字が増えたら、元のフォントから作り直す。入っていない字は、本文の書体で出る。作り直し忘れは CI（`node scripts/check-fonts.mjs`）が足りない字を挙げて止める。

`NewTegomin-subset.noglyph.txt` は、作品に出てくる字のうち、このフォントに入れない字（上の記号と、元のフォントにも無い字）の一覧。検査はこの字を数えない。作り直した後に、リポジトリの直下で `node scripts/check-fonts.mjs --update` を実行して書き直す。

```sh
pip install fonttools brotli
curl -sSL -o NewTegomin-Regular.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/newtegomin/NewTegomin-Regular.ttf
node -e "const fs=require('fs');fs.writeFileSync('chars.txt',[...new Set(['index.html','game.js','engine.js'].map(f=>fs.readFileSync('../'+f,'utf8')).join(''))].filter(c=>!/[\u00d7\u2190-\u2bff]/.test(c)).join(''))"
pyftsubset NewTegomin-Regular.ttf --text-file=chars.txt --flavor=woff2 --output-file=NewTegomin-subset.woff2
rm NewTegomin-Regular.ttf chars.txt
```
