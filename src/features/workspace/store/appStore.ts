import React from "react";
import { createEnvironmentSlice } from "src/features/workspace/store/slices/environmentSlice";
import { createSettingsSlice } from "src/features/workspace/store/slices/settingsSlice";
import { createDraftSlice } from "src/features/composer/store/slices/draftSlice";
import { createEditorSlice } from "src/features/composer/store/slices/editorSlice";
import { createNoteSlice } from "src/features/notes/store/slices/noteSlice";
import { createTasksSlice } from "src/features/tasks/store/slices/tasksSlice";
import type { MFDIStore } from "src/features/workspace/store/slices/types";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export function createAppStore() {
  return createStore<MFDIStore>((set, get, store) => ({
    ...createEnvironmentSlice(set, get, store),
    ...createSettingsSlice(set, get, store),
    ...createTasksSlice(set, get, store),
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
      mainView?: MFDIStore["mainView"];
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
