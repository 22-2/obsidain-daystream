import type { MFDIStorage } from "src/core/storage";
import type { Settings } from "src/settings";
import type { AppStoreApi } from "src/ui/store/appStore";
import { appStore, useCurrentAppStore } from "src/ui/store/appStore";
import type { MFDIStore, SettingsSlice } from "src/ui/store/slices/types";
import { useStore } from "zustand";

export const settingsStore = appStore;

export function initializeSettingsStore(
  settings: Settings,
  storage: MFDIStorage,
  store: AppStoreApi = appStore,
) {
  const state = store.getState();
  state.setPluginSettings(settings);
  state.setStorage(storage);
  state.hydrateSettingsState();
}

export function useSettingsStore<T>(selector: (state: SettingsSlice & MFDIStore) => T): T {
  const store = useCurrentAppStore();
  return useStore(store, selector as (state: MFDIStore) => T);
}
