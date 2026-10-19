import React from "react";
import { createEnvironmentSlice } from "src/features/workspace/store/slices/environmentSlice";
import { createSettingsSlice } from "src/features/workspace/store/slices/settingsSlice";
import { createDraftSlice } from "src/features/composer/store/slices/draftSlice";
import { createEditorSlice } from "src/features/composer/store/slices/editorSlice";
import { createNoteSlice } from "src/features/notes/store/slices/noteSlice";
import type { DSTRStore } from "src/features/workspace/store/slices/types";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export function createAppStore() {
  return createStore<DSTRStore>((set, get, store) => ({
    ...createEnvironmentSlice(set, get, store),
    ...createSettingsSlice(set, get, store),
    ...createNoteSlice(set, get, store),
    ...createEditorSlice(set, get, store),
    ...createDraftSlice(set, get, store),
  }));
}

export type AppStoreApi = ReturnType<typeof createAppStore>;

export const appStore = createAppStore();

const AppStoreContext = React.createContext<AppStoreApi | null>(null);

export function AppStoreProvider({
  store,
  children,
}: {
  store: AppStoreApi;
  children: React.ReactNode;
}) {
  return React.createElement(AppStoreContext.Provider, { value: store }, children);
}

/**
 * Returns the Store owned by the nearest view Provider.
 *
 * 意図: Provider がない場合に共有 Store へ黙って切り替えると view 間で状態が漏れるため、即座に失敗させる。
 */
export function useRequiredAppStore(): AppStoreApi {
  const store = React.useContext(AppStoreContext);
  if (!store) {
    throw new Error("AppStoreProvider is required for view-scoped Store access");
  }
  return store;
}

export function initializeAppStore(
  params: {
    shell: NonNullable<DSTRStore["shell"]>;
    settings: NonNullable<DSTRStore["pluginSettings"]>;
    storage: NonNullable<DSTRStore["storage"]>;
    initialViewState?: {
      noteMode: DSTRStore["viewNoteMode"];
      file: string | null;
      fixedSessionNumber: number;
      mainView?: DSTRStore["mainView"];
    };
  },
  store: AppStoreApi = appStore,
) {
  store.getState().initializeAppStore(params);
}

export function useAppStore<T>(selector: (state: DSTRStore) => T): T {
  const store = useRequiredAppStore();
  return useStore(store, selector);
}
