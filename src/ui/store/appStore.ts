import React from "react";
import { createDraftSlice } from "src/ui/store/slices/draftSlice";
import { createEditorSlice } from "src/ui/store/slices/editorSlice";
import { createEnvironmentSlice } from "src/ui/store/slices/environmentSlice";
import { createNoteSlice } from "src/ui/store/slices/noteSlice";
import { createPostsSlice } from "src/ui/store/slices/postsSlice";
import { createSettingsSlice } from "src/ui/store/slices/settingsSlice";
import type { MFDIStore } from "src/ui/store/slices/types";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export function createAppStore() {
  return createStore<MFDIStore>((set, get, store) => ({
    ...createEnvironmentSlice(set, get, store),
    ...createSettingsSlice(set, get, store),
    ...createPostsSlice(set, get, store),
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

export function useCurrentAppStore(): AppStoreApi {
  return React.useContext(AppStoreContext) ?? appStore;
}

/**
 * Returns the Store owned by the nearest view Provider.
 *
 * The fallback-backed hook above remains for legacy/test-only callers while
 * domain hooks use this boundary so a missing Provider fails immediately.
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
    shell: NonNullable<MFDIStore["shell"]>;
    settings: NonNullable<MFDIStore["pluginSettings"]>;
    storage: NonNullable<MFDIStore["storage"]>;
    initialViewState?: {
      noteMode: MFDIStore["viewNoteMode"];
      file: string | null;
      fixedSessionNumber: number;
    };
  },
  store: AppStoreApi = appStore,
) {
  store.getState().initializeAppStore(params);
}

export function useAppStore<T>(selector: (state: MFDIStore) => T): T {
  const store = useRequiredAppStore();
  return useStore(store, selector);
}
