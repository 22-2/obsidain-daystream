import { useRequiredAppStore } from "src/features/workspace/store/appStore";
import type { DSTRStore } from "src/features/workspace/store/slices/types";
import type { EditorSlice } from "src/features/composer/store/types";
import { useStore } from "zustand";

export function useEditorStore<T>(selector: (state: EditorSlice & DSTRStore) => T): T {
  const store = useRequiredAppStore();
  return useStore(store, selector as (state: DSTRStore) => T);
}
