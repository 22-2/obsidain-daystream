import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import type { AppStoreApi } from "src/features/workspace/store/appStore";
import { appStore, useRequiredAppStore } from "src/features/workspace/store/appStore";
import type { DaystreamStore } from "src/features/workspace/store/slices/types";
import type { TasksSlice } from "src/features/tasks/store/types";
import { useStore } from "zustand";

export const tasksStore = appStore;

export function initializeTasksStore(shell: ObsidianAppShell, store: AppStoreApi = appStore) {
  store.getState().setAppDependencies(shell);
}

export function useTasksStore<T>(selector: (state: TasksSlice & DaystreamStore) => T): T {
  const store = useRequiredAppStore();
  return useStore(store, selector as (state: DaystreamStore) => T);
}
