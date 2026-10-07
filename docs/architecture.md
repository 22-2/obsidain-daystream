# アーキテクチャ

## 境界

`src/main.ts` は Obsidian プラグインの入口で、各機能の登録と接続を行います。`core/` は共有domain、DB、platform adapter、UI基盤を所有し、featureの実装へ依存しません。`features/` は workspace、notes、posts、composer、tasks、settings、insights、activity-prompt の機能実装を所有します。

StoreはMFDI viewごとに一つの状態を保ちます。`features/workspace/store/appStore.ts` がworkspaceの環境・設定sliceと各featureのsliceを合成し、各featureは自分のslice型・factory・selector hookを所有します。画面のcompositionは利用するfeatureのUIを直接importし、Storeの参照は各featureのStore moduleから行います。全機能を束ねる汎用barrelは設けません。

## canonical入口と互換パス

内部実装のcanonical入口は `src/core/` と `src/features/` です。`src/settings.ts` は外部利用者向けの設定互換入口として残しています。旧UI pathの互換facadeは `src/ui/context/AppContext.tsx`、`src/ui/components/layout/EditorOnlyReactView.tsx`、`src/ui/components/posts/PostCardView.tsx` です。内部コードはこれらの旧pathに依存しません。

## 移行段階と検証

段階1で共有domain型・保存日時・metadata判定をUIから分離し、段階2でInsightsをfeature化しました。段階3でbuiltin登録とDB更新通知を分離しました。段階4で設定、DB、platform、共通UIおよび各画面機能をcore/featuresへ整理しました。段階5でStore sliceの所有場所、投稿保存service、互換pathを整理しました。

最終検証では `pnpm check` と `pnpm build` が成功しました。全unit testは408件中398件成功、5 filesの10件が失敗しました。この5 files・10 testsは移行前HEADでも再現するテスト失敗で、主な原因はObsidian mockに`setTooltip`がないことです。E2Eは15件中6件成功、9件失敗しました。失敗にはfixed note再読込、検索UI、投稿・編集、React viewのシナリオが含まれます。Electron 44.4.5のplatform binaryが当初欠落していましたが、復旧後に実行できました。移行前HEADとのE2E比較は調査途中で中断しています。テストはtoolkitのfresh temporary vaultを使い、ユーザーvaultには接続していません。
