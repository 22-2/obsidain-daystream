# アーキテクチャ

## 境界

`src/main.ts` は Obsidian プラグインの入口で、各機能の登録と接続を行います。`core/` は共有domain、DB、platform adapter、UI基盤を所有し、featureの実装へ依存しません。`features/` は workspace、notes、posts、composer、tasks、settings、insights、activity-prompt の機能実装を所有します。

StoreはMFDI viewごとに一つの状態を保ちます。`features/workspace/store/appStore.ts` がworkspaceの環境・設定sliceと各featureのsliceを合成し、各featureは自分のslice型・factory・selector hookを所有します。画面のcompositionは利用するfeatureのUIを直接importし、Storeの参照は各featureのStore moduleから行います。全機能を束ねる汎用barrelは設けません。

## canonical入口

内部実装の入口は `src/core/` と `src/features/` だけです。旧 `src/ui/` や `src/settings.ts` の互換facadeは、外部から参照されるプラグインではないため設けていません。

featureの共有型（`Post`、`Granularity` など）は `src/core/domain/` から直接importし、workspace経由の再exportは使いません。composerはworkspaceのview実装クラスに依存せず、`features/composer/types/composer-host.ts` の最小インターフェースで受け取ります。

## 移行段階と検証

段階1で共有domain型・保存日時・metadata判定をUIから分離し、段階2でInsightsをfeature化しました。段階3でbuiltin登録とDB更新通知を分離しました。段階4で設定、DB、platform、共通UIおよび各画面機能をcore/featuresへ整理しました。段階5でStore sliceの所有場所、投稿保存service、互換pathを整理しました。

検証はCIで行います。unit test（ubuntu / windows）とE2E（macOS / windows、15件）がすべて成功しています。E2Eは毎回まっさらな一時vaultで起動するため、初回起動（`data.json` なし）の経路も検証されます。
