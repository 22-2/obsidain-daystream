import { useRequiredAppStore } from "src/features/workspace/store/appStore";
import type { DaystreamStore } from "src/features/workspace/store/slices/types";
import type { EditorSlice } from "src/features/composer/store/types";
import { useStore } from "zustand";

export function useEditorStore<T>(selector: (state: EditorSlice & DaystreamStore) => T): T {
  const store = useRequiredAppStore();
  return useStore(store, selector as (state: DaystreamStore) => T);
}
