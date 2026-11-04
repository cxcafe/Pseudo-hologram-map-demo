# Pseudo-hologram 3D Map Demo

[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) と [OpenFreeMap](https://openfreemap.org/) を使用した、ホログラム風のインタラクティブな3D地図デモです。HTML・CSS・JavaScriptで構成され、データベースやAPIキーは不要です。

サンプル地点は札幌市・大通公園周辺に設定されています。地点、画像、地図デザイン、表示倍率などを変更して、別の地域でも利用できます。実際の空間投影ではなく、ブラウザ上での3D描画です。

## 主な機能

- **地図スタイル切り替え**：Dark / Positron
- **マーカー表示切り替え**：1 PIN（メイン地点のみ）/ MULTI PIN（有効な追加地点を含む）
- **3D建物表示**：立体建物を独自の色で描画
- **画像マーカー**：PNG等を指定でき、ズーム倍率に合わせてサイズを調整
- **所在地カード**：地点名・住所・Googleマップへのリンクを表示
- **地図操作**：拡大・縮小、90°回転、RESET、ドラッグ移動
- **情報表示**：ZOOM / PITCH / BEARING

`RESET` は地図の位置・ズーム・角度・所在地カードを初期状態に戻します。選択中の地図スタイルとマーカー表示モードは切り替えません。

## 必要な環境

- WebGL2対応のモダンブラウザ
- HTML / CSS / JavaScriptを配信できるWebサーバー（GitHub Pagesなど）
- インターネット接続（MapLibre GL JSと地図タイルを外部から読み込みます）

Node.jsやビルドツールは不要です。

## 使い始める

1. GitHubリポジトリの **Code → Download ZIP** で取得し、展開します。あるいはリポジトリをCloneします。
2. `index.html`、`style.css`、`app.js` を同じディレクトリに配置します。
3. そのディレクトリをWebサーバーから公開し、`index.html` にアクセスします。

### GitHub Pagesを使用する場合

1. リポジトリのルートに上記ファイルを配置します。
2. **Settings → Pages → Build and deployment** で **Deploy from a branch** を選択します。
3. 公開対象のブランチと `/(root)` を指定して保存します。
4. Pagesに表示された公開URLにアクセスします。

公開URLは各リポジトリの設定によって異なります。

## カスタマイズ

**地図とピンの設定値は、`app.js` 冒頭の `SETTINGS` に集約しています。** 基本的な利用では、この設定部分だけを編集してください。

### 1. 地点名・住所・地図の中心位置

**ファイル：`app.js` → `SETTINGS.mainPin`**

```javascript
mainPin: {
  id: 'A',
  name: '大通公園 3丁目',
  address: '〒060-0042 北海道札幌市中央区大通西3丁目',
  lng: 141.35290009102954,
  lat: 43.060641983971394,
  iconUrl: './images/pin-a.png',
  // ...画像のサイズに関する設定が続きます
}
```

`lng` は経度、`lat` は緯度（10進数）です。メインピンの座標が、ページ読み込み時の地図中心とRESET時の戻り先にも使われます。

### 2. 追加ピンの登録・無効化

**ファイル：`app.js` → `SETTINGS.optionalPins`**

配列に地点のオブジェクトを追加します。各地点の `id` は重複しない値にしてください。

```javascript
{
  id: 'D',
  enabled: true,
  name: 'サンプル地点',
  address: 'サンプル住所',
  lng: 141.3500,
  lat: 43.0600,
  iconUrl: './images/pin-d.png',
  height: 128,
  color: '#69ecff',
  baseZoom: 16,
  zoomMultiplier: 2,
  minScale: 1,
  maxScale: 3
}
```

- `enabled: false`：その追加ピンを表示対象から外します。
- `1 PIN`：メインピンのみ表示します。
- `MULTI PIN`：メインピンと、`enabled: true` の追加ピンを表示します。

### 3. ピン画像の変更

**ファイル：`app.js` → 各ピンの `iconUrl`、および `images/`**

```javascript
iconUrl: './images/my-marker.png',
```

画像ファイルを `images/` に置き、相対パスを指定します。**この配布物にはカスタムPNG画像は含まれていません。** 画像が見つからない場合は、各ピンの `color` に基づくSVGの代替ピンが表示されます。

画像の幅は元画像の縦横比に基づいて自動計算されます。透明部分の多い画像は、その透明部分もクリック対象の矩形に含まれる点に注意してください。

| 設定 | 意味 |
| --- | --- |
| `height` | 基準ズーム時の高さ（px） |
| `baseZoom` | `height` を基準にするズーム値 |
| `zoomMultiplier` | ズーム差1に対する拡大・縮小係数 |
| `minScale` / `maxScale` | サイズ倍率の下限・上限 |
| `color` | 代替SVGピンの色 |

### 4. 地図の初期表示と3D建物

**ファイル：`app.js` → `SETTINGS.map`**

| 設定 | 内容 |
| --- | --- |
| `height` | 地図の高さ（px） |
| `zoom` / `minZoom` / `maxZoom` | 初期ズームと操作可能範囲 |
| `pitch` / `bearing` | 初期の傾き・方位（度） |
| `padding` | 地図の内側余白 |
| `rotationEnabled` | 90°回転ボタンの有効・無効 |
| `pinLayerOrder` | ピンの画面上の高さが同じときの重なり順 |
| `showScale` | スケール表示の有効・無効 |
| `show3D` | 独自3D建物レイヤーの有効・無効 |
| `buildingColor` | 3D建物の色 |
| `defaultBuildingHeight` | 建物高さのデータがない場合の代替値 |
| `buildingOpacity` | 3D建物の不透明度（0〜1） |
| `buildingStartZoom` / `buildingFullZoom` | 3D建物の表示開始・高さの反映ズーム |
| `animationDuration` | 回転・RESETのアニメーション時間（ミリ秒） |
| `buildingSourceUrl` | 3D建物の元となるベクタータイルのURL |

`zoom` は `minZoom`〜`maxZoom` の範囲内で指定してください。追加する地図スタイルやデータソースによっては、3D建物に必要な `building` レイヤーが利用できない場合があります。

### 5. 地図スタイルと初期表示モード

**ファイル：`app.js` → `SETTINGS.map`**

```javascript
styles: {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  positron: 'https://tiles.openfreemap.org/styles/positron'
},
initialStyle: 'dark',
initialPinMode: 'multiple',
```

- 最初にPositronを表示する場合は `initialStyle: 'positron'` に変更します。
- 最初にメインピンだけ表示する場合は `initialPinMode: 'single'` に変更します。
- スタイルを追加する場合は、`styles` に識別キーとスタイルURLを追加し、`index.html` の `MAP STYLE` ボタンにも同じキーを `data-map-style` として追加してください。

`index.html` はトップページ固有のボタン配置と操作イベントを担当し、`app.js` が地図のスタイル・ピン表示を切り替えます。既存のボタンを使うだけなら、HTML側の変更は必要ありません。

### 6. 表示デザインの変更

- **トップページの切り替えボタン**：`index.html` 内の `<style>` と `#demo-options`
- **地図本体・所在地カード・操作ボタン**：`style.css`
- **色や寸法などのCSS変数**：`style.css` 冒頭の `:root` と `#holo-map-shell`

地図の操作ボタンは画像マーカーより前面に表示されるように設定されています。

## ファイル構成

```text
Pseudo-hologram-map-demo/
├── README.md                 # 導入・設定ガイド
├── LICENSE                   # 本プロジェクトのソースコードの利用条件
├── THIRD_PARTY_NOTICES.md   # 外部ライブラリ・地図の権利情報
├── index.html                # ページ構成とTOPページ専用の切り替えUI
├── style.css                 # 地図・カード・操作ボタンの共通スタイル
├── app.js                    # SETTINGSと地図本体の処理
└── images/                   # 任意のカスタムピン画像を配置するディレクトリ
```

## 利用技術とライセンス

本リポジトリに収録される独自のHTML・CSS・JavaScriptは、[MIT License](./LICENSE) で提供します。利用・改変・再配布の際はライセンスの条件に従ってください。

- **MapLibre GL JS 6.16.0**：地図描画ライブラリ（BSD-3-Clause）。CDNから読み込みます。
- **OpenFreeMap**：地図スタイルと地図タイルの配信元。
- **OpenStreetMap / OpenMapTiles**：地図データ・スタイルに関連する権利者・プロジェクト。

外部サービスとライブラリのライセンスは、プロジェクト本体のMITライセンスとは別です。詳細は [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) を参照してください。地図上の出典表示は削除しないでください。

カスタム画像などを追加する場合、利用者はその素材について適切な権利・利用許諾を確認してください。本配布物にはカスタム画像は同梱していません。
