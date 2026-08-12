import { useRequiredAppStore } from "src/ui/store/appStore";
import type { EditorSlice, MFDIStore } from "src/ui/store/slices/types";
import { useStore } from "zustand";

export function useEditorStore<T>(selector: (state: EditorSlice & MFDIStore) => T): T {
  const store = useRequiredAppStore();
  return useStore(store, selector as (state: MFDIStore) => T);
}
