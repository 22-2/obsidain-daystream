import { useLayoutEffect, useRef } from "react";
import { initializeAppStore, type AppStoreApi } from "src/features/workspace/store/appStore";

export function useAppStoreInitialization(
  params: Parameters<typeof initializeAppStore>[0],
  store: AppStoreApi,
): void {
  const initializedStore = useRef<AppStoreApi | null>(null);
  const { shell, settings, storage } = params;
  const initialViewStateRef = useRef(params.initialViewState);

  useLayoutEffect(() => {
    if (initializedStore.current === store) {
      // 意図: 設定更新は依存情報だけを同期し、保存済みの初期状態を再適用して
      // 最大化や現在のナビゲーション・編集状態をリセットしない。
      store.setState({ shell, pluginSettings: settings, storage });
      return;
    }

    // 意図: 子の live editor の passive effect より先に復元し、空の入力による上書きを防ぐ。
    initializeAppStore(
      {
        shell,
        settings,
        storage,
        initialViewState: initialViewStateRef.current,
      },
      store,
    );
    initializedStore.current = store;
  }, [shell, settings, storage, store]);
}
