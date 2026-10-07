import { useRequiredAppStore } from "src/features/workspace/store/appStore";
import type { MFDIStore } from "src/features/workspace/store/slices/types";
import type { EditorSlice } from "src/features/composer/store/types";
import { useStore } from "zustand";

export function useEditorStore<T>(selector: (state: EditorSlice & MFDIStore) => T): T {
  const store = useRequiredAppStore();
  return useStore(store, selector as (state: MFDIStore) => T);
}
