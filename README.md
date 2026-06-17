# FF14 Market Bot

Final Fantasy XIV の日本 DC マーケット価格を Discord から検索する Bot です。

Universalis のマーケット情報を使い、アイテム単価、全ワールド最安値、ホームワールド価格、マイセット一覧を表示できます。

## 主な機能

- メンションによるアイテム価格検索
- 複数アイテムの一括検索
- 日本 DC ごとの価格一覧表示
- 全ワールド最安値の表示
- DC / 金額以上 / 金額以下 / 出品ありのみの絞り込み
- ホームワールド登録と変更
- マイセット登録 / 削除
- マイセット価格一覧のページング表示
- `/ヘルプ` による使い方表示

## 使い方

### 価格検索

```text
@Bot アイテム名
```

複数アイテムも空白区切りで検索できます。

```text
@Bot アイテム1 アイテム2 アイテム3
```

### マイセット

```text
@Bot マイセット
```

マイセット一覧には、登録済みアイテムごとの全ワールド最安値と、ホームワールド登録済みの場合はホームワールド価格が表示されます。

一覧内のボタンから、アイテムの登録・削除・ページ移動ができます。

### ホームワールド登録

```text
/ホーム登録
```

または、価格一覧の `ホームワールド変更` ボタンから DC ごとのセレクトメニューで登録できます。

### ヘルプ

```text
/ヘルプ
```

Bot の基本的な使い方を Discord 上に表示します。

## データソース

- 価格情報: Universalis
- アイテム検索: XIVAPI / Cafemaker

Bot の表示内にも `source: universalis / xivapi / cafemaker` を記載しています。

## 技術構成

- Node.js
- TypeScript
- pnpm workspace
- discord.js
- Sapphire Framework
- PostgreSQL
- Drizzle ORM

## パッケージ構成

```text
packages/
  bot/          Discord Bot 本体
  db/           DB schema / migration / DB 関数
  lib/          共通 utility
  universalis/  Universalis / item search API client
```

## セットアップ

### 必要なもの

- Node.js 22.13 以上
- pnpm 11.7.0
- PostgreSQL
- Discord Bot Token

### 環境変数

プロジェクトルートに `.env` を作成してください。

```env
TOKEN=your_discord_bot_token
PG_URL=postgres://postgres:postgres@localhost:5432/postgres
```

### インストール

```bash
pnpm install
```

### ビルド

```bash
pnpm build
```

### 起動

```bash
pnpm start
```

開発中は以下でも起動できます。

```bash
pnpm dev
```

## DB / Migration

schema 変更後に migration を生成する場合:

```bash
pnpm generate
```

Bot 起動時に migration が実行されます。

## Docker

PostgreSQL と Bot を docker compose で起動できます。

```bash
docker compose up --build
```

## 注意事項

- この Bot は FFXIV / SQUARE ENIX 公式の Bot ではありません。
- マーケット価格は外部 API の取得結果に依存します。
- API のレートリミット時は待機してリトライします。
- public リポジトリのため、`.env` や Bot Token などの秘匿情報をコミットしないでください。

## ライセンス / 利用条件

このリポジトリのコードは、改変を行わない範囲で無償利用できます。

コードの改変、改変版の利用、改変版の再配布、または改変を伴う組み込み利用は有償です。希望する場合はリポジトリ管理者へ連絡してください。

無断での改変版の公開・再配布・販売は禁止します。
