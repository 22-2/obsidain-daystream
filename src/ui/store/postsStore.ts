import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import type { AppStoreApi } from "src/ui/store/appStore";
import { appStore, useRequiredAppStore } from "src/ui/store/appStore";
import type { MFDIStore, PostsSlice } from "src/ui/store/slices/types";
import { useStore } from "zustand";

export const postsStore = appStore;

export function initializePostsStore(shell: ObsidianAppShell, store: AppStoreApi = appStore) {
  store.getState().setAppDependencies(shell);
}

export function usePostsStore<T>(selector: (state: PostsSlice & MFDIStore) => T): T {
  const store = useRequiredAppStore();
  return useStore(store, selector as (state: MFDIStore) => T);
}
